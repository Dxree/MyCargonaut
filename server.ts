import 'zone.js/dist/zone-node';

import {ngExpressEngine} from '@nguniversal/express-engine';
import * as express from 'express';
import {Request, Response} from 'express';
import {join} from 'path';

import {AppServerModule} from './src/main.server';
import {APP_BASE_HREF} from '@angular/common';
import {existsSync} from 'fs';

import {Configuration} from 'config/config';
import * as mysql from 'mysql';
import {Connection, MysqlError} from 'mysql';
import * as session from 'express-session';
import * as bodyParser from 'body-parser';
import * as cryptoJS from 'crypto-js';
import * as multer from 'multer';
import * as fs from 'fs';

import {Cargonaut} from 'src/shared/cargonaut.model';
import {Vehicle} from './src/shared/vehicle.model';
import {Post} from './src/shared/post.model';
import {Rating} from './src/shared/rating.model';
import {Chat} from './src/shared/chat.model';
import {ChatMessage} from './src/shared/chat-message.model';
import {Hold} from './src/shared/hold.model';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/tmp/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb('Please upload only images.', false);
  }
};

const upload = multer({storage, fileFilter});

// cut off 'dist/MyCargonaut/server' from '../MyCargonaut/dist/MyCargonaut/server' (cause '../' in path is forbidden)
const tmp = __dirname.lastIndexOf('dist/MyCargonaut/server');
const onWindows = tmp === -1;
const rootDir = __dirname.substring(0, onWindows ? __dirname.lastIndexOf('dist\\MyCargonaut\\server') : tmp);


// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/MyCargonaut/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';
  const database: Connection = mysql.createConnection(Configuration.mysqlOptions);

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
  server.engine('html', ngExpressEngine({
    bootstrap: AppServerModule,
  }));

  server.set('view engine', 'html');
  server.set('views', distFolder);

  database.connect((err: MysqlError) => {
    if (err) {
      console.log('Database connection failed: ', err);
    } else {
      console.log('Database is connected.');
    }
  });

  server.use(bodyParser.json());
  server.use(session(Configuration.sessionOptions));
  server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  async function queryPromise(sql: string, data: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      database.query(sql, data, (err: MysqlError, rows: any) => {
        if (err) {
          reject(rows);
        } else {
          resolve(rows);
        }
      });
    });
  }

  function updateCookie(req: Request, res: Response, next: any) {
    // @ts-ignore
    if (req.session.user) {
      // @ts-ignore
      req.session.cookie.maxAge = req.session.cookie.maxAge + (5 * 60 * 1000); // 1 Minute
    }
    next();
  }

  /*****************************************************************************
   *           Authentication - Login / logout / Register       *
   *****************************************************************************/

  // insert in header of Route to check if the Persons logged in before executing the action
  function isLoggedIn(): (req: Request, res: Response, next: any) => void {
    return (req: Request, res: Response, next) => {
      // @ts-ignore
      if (req.session.user) {
        next();
      } else {
        res.status(200).send({
          message: 'User nicht mehr eingeloggt. Bitte anmelden!',
        });
      }
    };
  }

  // checks if User is allowed to use action
  function isPrivileged(permissionId: number) {
    return (req: Request, res: Response, next) => {
      // @ts-ignore
      if (permissionId === Number(req.session.user.id)) {
        next();
      } else {
        res.status(401).send({
          message: 'You have no Permission to do this.',
        });
      }
    };
  }

// check if logged in
  server.get('/api/login', isLoggedIn(), (req: Request, res: Response) => {
    res.status(200).send({
      message: 'User ist weiterhin eingeloggt!',
      // @ts-ignore
      user: req.session.user
    });
  });

// Login
  server.post('/api/login', (req: Request, res: Response) => {
    const email: string = req.body.email;
    const password: string = req.body.password;
    const data: [string, string] = [email, cryptoJS.SHA512(password).toString()];
    const query = 'SELECT * FROM cargonaut WHERE email = ? AND password = ?;';
    queryPromise(query, data).then(rows => {
      if (rows.length === 1) {
        const user: Cargonaut = {
          id: rows[0].id,
          firstname: rows[0].firstname,
          lastname: rows[0].lastname,
          email: rows[0].email,
          birthday: rows[0].geburtsdatum,
          account_holder: rows[0].kontoinhaber,
          iban: rows[0].iban,
          bic: rows[0].bic
        };
        // @ts-ignore
        req.session.user = user;
        res.status(200).send({
          message: 'Logged in!',
          user
        });
      } else {
        res.status(401).send({
          message: 'Login information is not correct!',
        });
      }
    }).catch(err => {
      res.status(500).send({
        message: 'Datenbank Fehler: ' + err,
      });
    });
  });

// Logout
  server.post('/api/logout', (req: Request, res: Response) => {
    // @ts-ignore
    delete req.session.user;
    res.status(200).send({
      message: 'Logged out!',
    });
  });

// Registrieren
  server.post('/api/cargonaut', async (req: Request, res: Response) => {
    const email: string = req.body.email;
    const emailQuery = 'SELECT * FROM cargonaut where email = ?;';
    queryPromise(emailQuery, [email]).then(rows => {
      if (rows.length > 0) {
        res.status(409).send({
          message: 'Fehler beim Erstellen eines Nutzers. Email Adresse bereits vergeben.',
        });
      } else {
        const firstname: string = req.body.firstname;
        const lastname: string = req.body.lastname;
        const password: string = cryptoJS.SHA512(req.body.password).toString();
        const birthday: string = (req.body.birthday).toLocaleString();
        const account_holder = req.body.account_holder;
        const iban = req.body.iban;
        const bic = req.body.bic;
        const data: [string, string, string, string, string, string, string, string] = [
          firstname,
          lastname,
          password,
          email,
          birthday,
          account_holder,
          iban,
          bic
        ];
        const query = 'INSERT INTO cargonaut (id, firstname, lastname, password, email, geburtsdatum, kontoinhaber, iban, bic) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?);';
        queryPromise(query, data).then(results => {
          res.status(201).send({
            message: 'Neuer Nutzer erstellt!',
            createdUser: results.insertId,
          });
        }).catch(() => {
            res.status(400).send({
              message: 'Fehler beim Erstellen eines Nutzers.',
            });
          }
        );
      }
    });
  });

// Change Password
  server.put('/api/password/:cargonaut', async (req: Request, res: Response) => {
    const id: number = Number(req.params.cargonaut);
    const password: string = cryptoJS.SHA512(req.body.password).toString();
    const data: [string, number] = [
      password,
      id,
    ];
    const query = 'UPDATE cargonaut SET password = ? WHERE id = ?;';
    queryPromise(query, data).then(result => {
      if (result.affectedRows > 0) {
        res.status(200).send({
          message: `Updated Password for user ${id}`,
        });
      } else {
        res.status(400).send({
          message: 'Keinen User zum bearbeiten gefunden.',
        });
      }
    }).catch(() => {
      res.status(400).send({
        message: 'Der User konnte nicht bearbeitet werden.',
      });
    });
  });


  /*****************************************************************************
   *           Cargonaut       *
   *****************************************************************************/


// Get Cargonaut -> Alle Infos eines Cargonauten
  server.get('/api/cargonaut/:id', (req: Request, res: Response) => {
    const id: string = req.params.id;
    const data: [string] = [
      id,
    ];
    const query = 'SELECT firstname, lastname FROM cargonaut WHERE id = ?;';
    queryPromise(query, data).then(results => {
      if (results.length > 0) {
        const user: Cargonaut = {
          id: results[0].id,
          firstname: results[0].firstname,
          lastname: results[0].lastname,
          // email: results[0].email,
          // birthday: results[0].geburtsdatum,
        };
        res.status(200).send({
          user,
        });
      } else {
        res.status(400).send({
          message: 'Der User konnte nicht gefunden werden!',
        });
      }
    }).catch(() => {
      res.status(400).send({
        message: 'Fehler beim getten des Users!',
      });
    });
  });

// Put Cargonaut
  server.put('/api/cargonaut/:id', async (req: Request, res: Response) => {
    const id: number = Number(req.params.id);
    const firstname: string = req.body.firstname;
    const lastname: string = req.body.lastname;
    const birthday: string = req.body.birthday;
    const data: [string, string, string, number] = [
      firstname,
      lastname,
      birthday,
      id
    ];
    const query = 'UPDATE cargonaut SET firstname = ?, lastname = ?, geburtsdatum = ? WHERE id = ?;';
    queryPromise(query, data).then(result => {
      if (result.affectedRows > 0) {
        // @ts-ignore
        req.session.user.firstname = firstname;
        // @ts-ignore
        req.session.user.lastname = lastname;
        // @ts-ignore
        req.session.user.birthday = birthday;
        res.status(200).send({
          message: `Updated user ${id}`,
        });
      } else {
        res.status(400).send({
          message: 'Keinen User zum bearbeiten gefunden.',
        });
      }
    }).catch(() => {
      res.status(400).send({
        message: 'Der User konnte nicht bearbeitet werden.',
      });
    });
  });

  // Delete Cargonaut
  server.delete('/api/cargonaut/:id', (req: Request, res: Response) => {
    const id: number = Number(req.params.id);
    const imageQuery = 'SELECT image from cargonaut WHERE id = ?';
    let imageFile = null;
    queryPromise(imageQuery, [id]).then(rows => {
      if (rows.length === 1) {
        imageFile = rows[0].image;
      } else {
        res.status(400).send({
          message: 'User konnte nicht gefunden werden!',
        });
      }
    });
    const query = 'DELETE FROM cargonaut WHERE id = ?;';
    queryPromise(query, [id]).then(result => {
      // Check if database response contains at least one entry
      if (result.affectedRows === 1) {
        if (imageFile) {
          imageFile = onWindows ? imageFile.replace('/', '\\') : imageFile;
          fs.unlink(rootDir + imageFile, (err) => {
            if (err) {
              console.log('Error: Could not delete file at ' + imageFile);
            } else {
            }
          });
        }
        res.status(200).send({
          message: `User gelöscht`,
        });
      } else {
        res.status(400).send({
          message: 'User konnte nicht gefunden werden!',
        });
      }
    }).catch(err => {
      // Database operation has failed
      res.status(500).send({
        message: 'Datenbank Fehler: ' + err
      });
    });
  });

  // Upload Profile Image
  server.post('/api/cargonaut/:id/upload', upload.single('image'), (req: Request, res: Response) => {
    const id: number = Number(req.params.id);
    let oldFile = null;
    const imageQuery = 'SELECT image from cargonaut WHERE id = ?';
    queryPromise(imageQuery, [id]).then(rows => {
      if (rows.length === 1) {
        oldFile = rows[0].image;
      } else {
        res.status(400).send({
          message: 'User konnte nicht gefunden werden!',
        });
      }
    });
    const data: [string, number] = [
      req.file.path,
      id
    ];
    const query = 'UPDATE cargonaut SET image = ? WHERE id = ?;';
    queryPromise(query, data).then(result => {
      // Check if database response contains at least one entry
      if (result.affectedRows === 1) {
        if (oldFile) {
          oldFile = onWindows ? oldFile.replace('/', '\\') : oldFile;
          fs.unlink(rootDir + oldFile, (err) => {
            if (err) {
              console.log('Error: Could not delete file at ' + oldFile);
            }
          });
        }
        res.setHeader('Cache-Control', 'no-cache');
        res.status(200).send({
          message: `Bild gespeichert.`,
        });
      } else {
        res.status(400).send({
          message: 'Bild konnte nicht gespeichert werden!',
        });
      }
    }).catch(err => {
      // Database operation has failed
      res.status(500).send({
        message: 'Datenbank Fehler: ' + err
      });
    });
  });

  // Get Profile image of Cargonaut
  server.get('/api/cargonaut/:id/image', (req: Request, res: Response) => {
    const id: string = req.params.id;
    const data: [string] = [
      id,
    ];
    const query = 'SELECT image FROM cargonaut WHERE id = ?;';
    queryPromise(query, data).then(rows => {
      if (rows.length === 1) {
        res.setHeader('Cache-Control', 'no-cache');
        if (rows[0].image) {
          const imageFile = onWindows ? rows[0].image.replace('/', '\\') : rows[0].image;
          res.sendFile(imageFile, {root: rootDir});
        } else {
          res.sendStatus(204);
        }
      } else {
        res.status(404).send({
          message: 'Kein Bild gefunden.',
        });
      }
    });
  });

  // Delete image of Cargonaut
  server.delete('/api/cargonaut/:id/image', (req: Request, res: Response) => {
    const id: string = req.params.id;
    let oldFile = null;
    const imageQuery = 'SELECT image from cargonaut WHERE id = ?';
    queryPromise(imageQuery, [id]).then(rows => {
      if (rows.length === 1) {
        oldFile = rows[0].image;
      } else {
        res.status(400).send({
          message: 'User konnte nicht gefunden werden!',
        });
      }
    });
    const query = 'UPDATE cargonaut SET image = NULL WHERE id = ?;';
    queryPromise(query, [id]).then(result => {
      // Check if database response contains at least one entry
      if (result.affectedRows === 1) {
        if (oldFile) {
          oldFile = onWindows ? oldFile.replace('/', '\\') : oldFile;
          fs.unlink(rootDir + oldFile, (err) => {
            if (err) {
              console.log('Error: Could not delete file at ' + oldFile);
            }
          });
        }
        res.setHeader('Cache-Control', 'no-cache');
        res.status(200).send({
          message: `Bild gelöscht.`,
        });
      } else {
        res.status(400).send({
          message: 'Bild konnte nicht gelöscht werden!',
        });
      }
    }).catch(err => {
      // Database operation has failed
      res.status(500).send({
        message: 'Datenbank Fehler: ' + err
      });
    });
  });

  /*****************************************************************************
   *           Fahrzeuge       *
   *****************************************************************************/


// add new vehicle
  server.post('/api/vehicle/:owner', (req: Request, res: Response) => {
    // Read data from request body
    const art: string = req.body.type;
    const anzahlSitzplaetze: number = req.body.seats;
    const besitzer: string = req.params.owner;
    const laenge: number = req.body.length;
    const breite: number = req.body.width;
    const hoehe: number = req.body.height;
    const kommentar: string = req.body.comment;
    const modell: string = req.body.model;
    let ladeflaeche: number;

    if (art && anzahlSitzplaetze && hoehe && breite && laenge && besitzer && modell) {
      const dataLade: [number, number, number] = [
        laenge,
        breite,
        hoehe,
      ];

      const queryLade = 'INSERT INTO laderaum (id, ladeflaeche_laenge_cm, ladeflaeche_breite_cm, ladeflaeche_hoehe_cm) VALUES (NULL, ?, ?, ?);';
      queryPromise(queryLade, dataLade).then(result => {
        ladeflaeche = result.insertId;
        const data: [string, number, number, string, string, string] = [
          art,
          anzahlSitzplaetze,
          ladeflaeche,
          besitzer,
          modell,
          kommentar
        ];
        const query = 'INSERT INTO fahrzeug (id, art, anzahl_sitzplaetze, ladeflaeche, besitzer, modell, kommentar) VALUES (NULL, ?, ?, ?, ?, ?, ?);';
        queryPromise(query, data).then(results => {
          res.status(201).send({
            message: 'Neues Fahrzeug erstellt!',
            createdVehicle: results.insertId,
          });
        }).catch(() => {
            res.status(400).send({
              message: 'Fehler beim Erstellen eines Fahrzeugs.',
            });
          }
        );

      }).catch(() => {
        res.status(400).send({
          message: 'Fehler beim Erstellen eines Laderaums.',
        });
      });
    } else {
      res.status(400).send({
        message: 'Nicht alle Felder ausgefüllt.',
      });
    }
  });


// get vehicle -> Alle Infos eines Fahrzeugs
  server.get('/api/vehicle/:id', (req: Request, res: Response) => {
    const id: string = req.params.id;
    const data: [string] = [
      id,
    ];
    const query = 'SELECT * FROM fahrzeug WHERE id = ?;';
    const query2 = 'SELECT * FROM laderaum WHERE id =?;';
    queryPromise(query, data).then(results => {
      if (results.length > 0) {
        const data2: [string] = [results[0].ladeflaeche];
        queryPromise(query2, data2).then(results2 => {
          res.status(200).send({
            vehicle: results[0],
            hold: results2[0]
          });
        }).catch(() => {
          res.status(400).send({
            message: 'Fehler beim Getten des Fahrzeugs!',
          });
        });
      } else {
        res.status(400).send({
          message: 'Das Fahrzeug konnte nicht gefunden werden!',
        });
      }
    }).catch(() => {
      res.status(400).send({
        message: 'Fehler beim getten des Fahrzeugs!',
      });
    });
  });

// get vehicles from cargonaut -> Alle Fahrzeuge, die ein bestimmter Cargonaut erstellt hat
  server.get('/api/vehicles/:cargonaut', (req: Request, res: Response) => {
    const cargonaut: string = req.params.cargonaut;
    const data: [string] = [
      cargonaut,
    ];
    const query = 'SELECT * FROM fahrzeug WHERE besitzer = ?;';
    queryPromise(query, data).then(results => {
      const vehicles: Vehicle [] = [];
      for (const result of results) {
        const vehicle: Vehicle = {
          id: result.id,
          type: {
            type: result.art
          },
          seats: result.anzahl_sitzplaetze,
          hold: result.ladeflaeche,
          owner: result.besitzer
        };
        vehicles.push(vehicle);
      }
      res.status(200).send({
        vehicles: results,
      });
    }).catch(() => {
      res.status(400).send({
        message: 'Fehler beim getten der Fahrzeuge!',
      });
    });
  });

// delete vehicle
  server.delete('/api/vehicle/:id', (req: Request, res: Response) => {
    const id: number = Number(req.params.id);
    const query = 'DELETE FROM fahrzeug WHERE id = ?;';

    queryPromise(query, [id]).then(result => {
      // Check if database response contains at least one entry
      if (result.affectedRows === 1) {
        res.status(200).send({
          message: `Fahrzeug gelöscht`,
        });
      } else {
        res.status(400).send({
          message: 'Fahrzeug konnte nicht gefunden werden!',
        });
      }
    }).catch(err => {
      // Database operation has failed
      res.status(500).send({
        message: 'Datenbank Fehler: ' + err
      });
    });
  });

  // Update vehicle
  server.put('/api/vehicle/:vehicle', (req: Request, res: Response) => {
    // Read data from request body
    const id: number = Number(req.params.vehicle);
    const art: string = req.body.vehicle.type.type;
    const anzahlSitzplaetze: number = req.body.vehicle.seats;
    const laenge: number = req.body.vehicle.hold.length;
    const breite: number = req.body.vehicle.hold.width;
    const hoehe: number = req.body.vehicle.hold.height;
    const kommentar: string = req.body.vehicle.comment;
    const modell: string = req.body.vehicle.type.description;
    let ladeflaeche: number;
    const dataLade: [number, number, number] = [
      laenge,
      breite,
      hoehe,
    ];
    const queryLade = 'INSERT INTO laderaum (id, ladeflaeche_laenge_cm, ladeflaeche_breite_cm, ladeflaeche_hoehe_cm) VALUES (NULL, ?, ?, ?);';
    queryPromise(queryLade, dataLade).then(result => {
      ladeflaeche = result.insertId;
      const data: [string, number, number, string, string, number] = [
        art,
        anzahlSitzplaetze,
        ladeflaeche,
        modell,
        kommentar,
        id
      ];
      const query = 'UPDATE fahrzeug SET art = ?, anzahl_sitzplaetze = ?, ladeflaeche = ?, modell = ?, kommentar = ? WHERE id = ?;';
      queryPromise(query, data).then(results => {
        res.status(201).send({
          message: 'Fahrzeug aktualisiert!',
          createdVehicle: results.insertId,
        });
      }).catch(() => {
          res.status(400).send({
            message: 'Fehler beim Updaten des Fahrzeugs.',
          });
        }
      );

    }).catch(() => {
      res.status(400).send({
        message: 'Fehler beim Aktualisieren des Laderaums.',
      });
    });
  });
  /*****************************************************************************
   *           Post       * //
   *****************************************************************************/


// create Post
  server.post('/api/post/:cargonaut', async (req: Request, res: Response) => {
    // Read data from request body
    const cargonaut: number = Number(req.params.cargonaut);
    const startzeit: string = req.body.post.start_time.substring(0, req.body.post.start_time.length - 1);
    const ankunftZeit: string = req.body.post.end_time.substring(0, req.body.post.end_time.length - 1);
    const bezahlungsart: string = req.body.post.payment;

    const fahrzeug: number = req.body.post.vehicle?.id;
    const anzahlSitzplaetze: number = req.body.post?.seats;
    const beschreibung: string = (req.body.post.description ? req.body.post.description : 'no description');
    const typ: string = req.body.post.type; // 'Angebot' oder 'Gesuch'
    const preis = req.body.post.price;

    const startlocation: string = req.body.post.startlocation;
    const endlocation: string = req.body.post.endlocation;
    const laenge: number = req.body.post.hold?.length;
    const breite: number = req.body.post.hold?.width;
    const hoehe: number = req.body.post.hold?.height;
    let laderaum: number;
    const fahrzeugTyp: string = req.body.post.vehicleType;

    if (cargonaut && startzeit && ankunftZeit && bezahlungsart && typ && preis && startlocation &&
      endlocation && ((laenge && breite && hoehe) || anzahlSitzplaetze)) {
      // create laderaum
      const dataLaderaum: [number, number, number] = [
        laenge,
        breite,
        hoehe,
      ];
      if (laenge && breite && hoehe) {
        const queryLade = 'INSERT INTO laderaum (id, ladeflaeche_laenge_cm, ladeflaeche_breite_cm, ladeflaeche_hoehe_cm) VALUES (NULL, ?, ?, ?);';
        await queryPromise(queryLade, dataLaderaum).then(resu => {
          laderaum = resu.insertId;
          // create Post
        }).catch(() => {
            res.status(400).send({
              message: 'Fehler beim Erstellen eines Posts.',
            });
          }
        );
      } else {
        console.log('Kein Laderaum angegeben.');
      }
      const data: [string, string, string, string, string, number, number, number, string, string, number, any, string] = [
        startlocation,
        endlocation,
        startzeit,
        ankunftZeit,
        bezahlungsart,
        laderaum ? laderaum : null,
        fahrzeug ? fahrzeug : null,
        anzahlSitzplaetze,
        beschreibung,
        typ,
        cargonaut,
        preis,
        fahrzeugTyp ? fahrzeugTyp : null
      ];
      const query = 'INSERT INTO `post` (`id`, `standort`, `zielort`, `startzeit`, `ankunft_zeit`, `bezahlungsart`, `laderaum`, `fahrzeug`, `gebucht`, `anzahl_sitzplaetze`, `beschreibung`, `typ`, `verfasser`, `status`, `preis`, fahrzeug_typ) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, \'0\',?, ?, ?, ?, \'ausstehend\', ?, ?);';
      queryPromise(query, data).then(resultPost => {
        res.status(201).send({
          message: 'Neuer Post erstellt!',
          createdVehicle: resultPost.insertId,
        });
      }).catch(() => {
          res.status(400).send({
            message: 'Fehler beim Erstellen eines Posts.',
          });
        }
      );
    } else {
      res.status(400).send({
        message: 'Nicht alle Felder ausgefüllt.',
      });
    }
  });


// get specific Post -> Alle Infos zu speziellem Post
  server.get('/api/post/:id', (req: Request, res: Response) => {
    const id: string = req.params.id;
    const data: [string] = [
      id,
    ];
    const query = 'SELECT * FROM post WHERE id = ?;';
    queryPromise(query, data).then(async results => {
      const result = results[0];
      const laderaum = result?.laderaum;
      const post: Post = {
        id: result.id,
        startlocation: result.standort,
        endlocation: result.zielort,
        start_time: result.startzeit,
        end_time: result.ankunft_zeit,
        payment: result.bezahlungsart,
        vehicle: result?.fahrzeug,
        seats: result.anzahl_sitzplaetze,
        type: result.typ,
        author: result.verfasser,
        price: result.preis,
        closed: result.gebucht,
        description: result.beschreibung,
        status: result.status,
        vehicleType: result.fahrzeug_typ
      };
      const holdQuery = 'SELECT * FROM laderaum WHERE id = ?;';
      if (laderaum) {
        await queryPromise(holdQuery, [laderaum]).then(r => {
            const hold = r[0];
            post.hold = new Hold(hold.ladeflaeche_laenge_cm, hold.ladeflaeche_breite_cm, hold.ladeflaeche_hoehe_cm);
          }, error => {
            console.log('Error: ' + error);
            res.status(400).send({message: 'Fehler beim Laderaum.'});
          }
        );
      }
      res.status(200).send({
        post
      });
    }).catch((err) => {
      res.status(400).send({
        message: 'Fehler beim getten des Posts!',
      });
    });
  });

// get all Posts -> Alle Posts
  server.get('/api/posts', (req: Request, res: Response) => { // parameter for sort and filtering
    /*
    const parameter: string = req.params.parameter;

    switch (parameter){
      case '':
        break;
    }
  */
    const query = 'SELECT * FROM post WHERE gebucht = ? ORDER BY id DESC;';
    queryPromise(query, [0]).then(async results => {
      const posts: Post [] = [];
      for (const result of results) {
        const laderaum = result?.laderaum;
        const post: Post = {
          id: result.id,
          startlocation: result.standort,
          endlocation: result.zielort,
          start_time: result.startzeit,
          end_time: result.ankunft_zeit,
          payment: result.bezahlungsart,
          vehicle: {
            id: result?.fahrzeug
          },
          seats: result.anzahl_sitzplaetze,
          type: result.typ,
          author: {
            id: result.verfasser
          },
          price: result.preis,
          closed: result.gebucht,
          description: result.beschreibung,
          status: result.status,
          vehicleType: result.fahrzeug_typ
        };
        const holdQuery = 'SELECT * FROM laderaum WHERE id = ?;';
        if (laderaum) {
          await queryPromise(holdQuery, [laderaum]).then(r => {
              const hold = r[0];
              post.hold = new Hold(hold.ladeflaeche_laenge_cm, hold.ladeflaeche_breite_cm, hold.ladeflaeche_hoehe_cm);
            }, error => {
              console.log('Error: ' + error);
              res.status(400).send({message: 'Fehler beim Laderaum.'});
            }
          );
        }
        posts.push(post);
      }
      res.status(200).send({
        posts,
      });
    }).catch(() => {
      res.status(400).send({
        message: 'Fehler beim getten der Posts!',
      });
    });
  });

// Update post
  server.put('/api/post/:id', (req: Request, res: Response) => {

    const id: number = Number(req.params.id);
    const startzeit: string = req.body.post.start_time.substring(0, req.body.post.start_time.length - 1);
    const ankunftZeit: string = req.body.post.end_time.substring(0, req.body.post.start_time.length - 1);
    const bezahlungsart: string = req.body.post.payment;
    // const fahrzeug: number = req.body.vehicle;
    const anzahlSitzplaetze: number = req.body.post.seats;
    const beschreibung: string = req.body.post.description;
    const preis = req.body.post.price;
    const fahrzeugTyp = req.body.post.vehicleType;

    const data: [string, string, string, number, string, any, string, number] = [
      startzeit,
      ankunftZeit,
      bezahlungsart,
      // fahrzeug,
      anzahlSitzplaetze,
      beschreibung,
      preis,
      fahrzeugTyp,
      id
    ];
    const query = 'UPDATE post SET startzeit = ?, ankunft_zeit = ?, bezahlungsart = ?, anzahl_sitzplaetze = ?, beschreibung = ?, preis = ?, fahrzeug_typ = ? WHERE id = ?;';
    queryPromise(query, data).then(() => {
      res.status(200).send({
        message: `Updated post ${id}`,
      });
    }).catch((err) => {
      res.status(400).send({
        message: 'Der Post konnte nicht bearbeitet werden.',
      });
    });
  });


  /*****************************************************************************
   *           buchung       * //
   *****************************************************************************/


// Post Buchung
  server.post('/api/buchung/:kaeufer', (req: Request, res: Response) => {
    // Read data from request body
    const kaeufer: number = Number(req.params.kaeufer);
    const laenge: number = req.body.length;
    const breite: number = req.body.width;
    const hoehe: number = req.body.height;
    const anzahlSitzplaetze: number = req.body.seats;
    const post: number = req.body.post;
    let ladeflaeche: number;
    if (kaeufer && laenge && breite && hoehe && anzahlSitzplaetze && post) {
      const dataLade: [number, number, number] = [
        laenge,
        breite,
        hoehe,
      ];
      const queryLade = 'INSERT INTO laderaum (id, ladeflaeche_laenge_cm, ladeflaeche_breite_cm, ladeflaeche_hoehe_cm) VALUES (NULL, ?, ?, ?);';
      queryPromise(queryLade, dataLade).then(result => {
        ladeflaeche = result.insertId;
        const data: [number, number, number, number] = [
          kaeufer,
          ladeflaeche,
          anzahlSitzplaetze,
          post,
        ];
        const query = 'INSERT INTO buchung (id, gebucht_von, ladeflaeche, anzahl_sitzplaetze, post) VALUES (NULL, ?, ?, ?, ?);';
        queryPromise(query, data).then(results => {
          res.status(201).send({
            message: 'Gebucht!'
          });
        }).catch(() => {
            res.status(400).send({
              message: 'Fehler beim buchen.',
            });
          }
        );
      }).catch(() => {
        res.status(400).send({
          message: 'Fehler beim Erstellen eines Laderaums.',
        });
      });
    } else {
      res.status(400).send({
        message: 'Nicht alle Felder ausgefüllt.',
      });
    }
  });

// Get buchungen/:cargonaut -> Alle Buchungen, die ein bestimmter Cargonaut gebucht ODER VON IHM GEBUCHT WURDEN
  server.get('/api/buchungen/:cargonaut', (req: Request, res: Response) => {
    const cargonaut: number = Number(req.params.cargonaut);
    const data: [number, number] = [
      cargonaut,
      cargonaut,
    ];
    const query = 'SELECT * FROM buchung, post WHERE buchung.post = post.id AND (buchung.gebucht_von = ? OR post.verfasser = ?)';
    queryPromise(query, data).then(results => {
      res.status(200).send({
        buchungen: results,
      });
    }).catch(() => {
      res.status(400).send({
        message: 'Fehler beim getten des Posts!',
      });
    });
  });

  server.put('/api/buchungen/:post', (req: Request, res: Response) => {
    // Read data from request body
    const id: number = Number(req.params.post);
    const status: string = req.body.data.status;
    const data: [string, number] = [status, id];
    const query = 'UPDATE post SET status= ? WHERE id = ?';
    queryPromise(query, data).then(results => {
      res.status(200).send({
        message: 'Updated!'
      });
    }).catch(() => {
      res.status(400).send({
        message: 'Fehler beim Aktualisieren des Status!',
      });
    });
  });


  /*****************************************************************************
   *           Bewertung       * //
   *****************************************************************************/


// Post Bewertung
  server.post('/api/bewertung/:verfasser', (req: Request, res: Response) => {
    // Read data from request body
    const verfasser: number = Number(req.params.verfasser);
    const fahrt: number = req.body.fahrt;
    const punktzahl: number = req.body.punktzahl;
    const kommentar: string = req.body.kommentar;
    if (verfasser && fahrt && punktzahl && kommentar) {
      const data: [number, number, number, string] = [
        verfasser,
        fahrt,
        punktzahl,
        kommentar,
      ];
      const query = 'INSERT INTO bewertung (id, verfasser, fahrt, punktzahl, kommentar) VALUES (NULL, ?, ?, ?, ?);';
      queryPromise(query, data).then(results => {
        res.status(201).send({
          message: 'Bewertung abgegeben!'
        });
      }).catch(() => {
          res.status(400).send({
            message: 'Fehler beim Abgeben der Bewertung.',
          });
        }
      );
    } else {
      res.status(400).send({
        message: 'Nicht alle Felder ausgefüllt.',
      });
    }
  });

// get bewertungen -> Alle Bewertungen, die zu Fahrten eines bestimmten Cargonauten geschrieben wurden
  server.get('/api/bewertungen/:cargonaut', (req: Request, res: Response) => {
    const cargonaut: number = Number(req.params.cargonaut);
    const data: [number] = [
      cargonaut,
    ];
    const query = 'SELECT bewertung.id, bewertung.verfasser, bewertung.fahrt, bewertung.punktzahl, bewertung.kommentar FROM bewertung, post WHERE bewertung.fahrt = post.id AND post.verfasser = ? ORDER BY id DESC';
    queryPromise(query, data).then(results => {
      const ratings: Rating [] = [];
      for (const result of results) {
        const rating: Rating = {
          id: result.id,
          author: result.verfasser,
          trip: result.fahrt,
          ratingStars: result.punktzahl,
          comment: result.kommentar
        };
        ratings.push(rating);
      }
      res.status(200).send({
        ratings,
      });
    }).catch(() => {
      res.status(400).send({
        message: 'Fehler beim Getten der Bewertungen!',
      });
    });
  });
  // get bewertungen -> Alle Bewertungen, die zu einem Post gehören
  server.get('/api/bewertungen/:post', (req: Request, res: Response) => {
    const post: number = Number(req.params.post);
    const data: [number] = [
      post,
    ];
    const query = 'SELECT * FROM bewertung WHERE fahrt = ? ORDER BY id DESC';
    queryPromise(query, data).then(results => {
      const ratings: Rating [] = [];
      for (const result of results) {
        const rating: Rating = {
          id: result.id,
          author: result.verfasser,
          trip: result.fahrt,
          ratingStars: result.punktzahl,
          comment: result.kommentar
        };
        ratings.push(rating);
      }
      res.status(200).send({
        ratings,
      });
    }).catch(() => {
      res.status(400).send({
        message: 'Fehler beim getten der Bewertungen!',
      });
    });
  });
// Durchschnittsbewertung eines Cargonauten
  server.get('/api/avgBewertung/:cargonaut', (req: Request, res: Response) => {
    const cargonaut: number = Number(req.params.cargonaut);
    const data: [number] = [
      cargonaut,
    ];
    const query = 'SELECT AVG(punktzahl) AS avg FROM bewertung, post WHERE bewertung.fahrt = post.id AND post.verfasser = ?';
    queryPromise(query, data).then(results => {
      res.status(200).send({
        avgBewertung: results[0],
      });
    }).catch(() => {
      res.status(400).send({
        message: 'Fehler beim getten der Bewertungen!',
      });
    });
  });
  /*****************************************************************************
   *           Chat        * //
   *****************************************************************************/
  server.get('/api/chats/:cargonaut', (req, res) => {
    const cargonaut: number = Number(req.params.cargonaut);
    const data: [number, number] = [
      cargonaut,
      cargonaut
    ];
    const query = 'SELECT * FROM `chat` WHERE cargonaut_1 = ? OR cargonaut_2 = ?';
    queryPromise(query, data).then(results => {
      const chats: Chat [] = [];
      for (const result of results) {
        const chat: Chat = {id: result.id, fstMember: result.cargonaut_1, sndMember: result.cargonaut_2};
        chats.push(chat);
      }
      res.status(200).send({
        chats,
      });
    });
  });

  server.post('/api/message/:verfasser', (req: Request, res: Response) => {
    // Read data from request body
    const verfasser: number = Number(req.params.verfasser);
    const chat: number = req.body.chat;
    const message: string = req.body.message;
    const zeit: string = (req.body.zeit).slice(0, -1);
    if (verfasser && chat && message) {
      const data: [number, number, string, string] = [
        verfasser,
        chat,
        message,
        zeit
      ];
      const query = 'INSERT INTO chatnachricht (id, verfasser, chat, nachricht, zeit) VALUES (NULL, ?, ?, ?, TIMESTAMP(?));';
      queryPromise(query, data).then(results => {
        res.status(201).send({
          message: 'Chatnachricht gesendet!'
        });
      }).catch(() => {
          res.status(400).send({
            message: 'Fehler beim Senden der Chatnachricht.',
          });
        }
      );
    } else {
      res.status(400).send({
        message: 'Nicht alle Felder ausgefüllt.',
      });
    }
  });

  server.post('/api/getOrCreateChat', (req: Request, res: Response) => {
    // Read data from request body
    const cargonaut1: number = Number(req.body.cargonaut1);
    const cargonaut2: number = Number(req.body.cargonaut2);
    if (cargonaut1 && cargonaut2) {
      const data: [number, number, number, number] = [
        cargonaut1,
        cargonaut2,
        cargonaut1,
        cargonaut2
      ];
      const query = 'SELECT * FROM `chat` WHERE (cargonaut_1 = ? AND cargonaut_2 = ?) OR (cargonaut_2 = ? AND cargonaut_1 = ?)';
      queryPromise(query, data).then(results => {
        if (results.length > 0) {
          const result = results[0];
          res.status(200).send({
            chatId: result.id
          });
        } else {
          const innerData: [number, number] = [
            cargonaut1,
            cargonaut2
          ];
          const innerQuery = 'INSERT INTO `chat` (`id`, `cargonaut_1`, `cargonaut_2`) VALUES (NULL, ?, ?)';
          queryPromise(innerQuery, innerData).then(createdChat => {
            res.status(201).send({
              chatId: createdChat.insertId
            });
          });
        }
      }).catch(() => {
          res.status(400).send({
            message: 'error creating or getting the chat.',
          });
        }
      );
    } else {
      res.status(400).send({
        message: 'Nicht alle Felder ausgefüllt.',
      });
    }
  });

  server.get('/api/chat/:id', (req: Request, res: Response) => {
    const id: number = Number(req.params.id);
    const query = 'SELECT * FROM `chat` WHERE id = ?';
    queryPromise(query, [id]).then(results => {
      const chat: Chat = {id: results[0].id, fstMember: results[0].cargonaut_1, sndMember: results[0].cargonaut_2};
      res.status(200).send({
        chat
      });
    });
  });

  server.get('/api/chatMessages/:chatId', (req: Request, res: Response) => {
    const id: number = Number(req.params.chatId);
    const messages: ChatMessage [] = [];
    const query = 'SELECT * FROM `chatnachricht` WHERE chat = ?';
    queryPromise(query, [id]).then(results => {
      for (const result of results) {
        const message: ChatMessage = {
          author: result.verfasser,
          chat: result.chat,
          id: result.id,
          message: result.nachricht,
          sentAt: result.zeit
        };
        messages.push(message);
      }
      res.status(200).send({
        messages
      });
    });
  });


  /*****************************************************************************
   *           Angular        * //
   *****************************************************************************/
  server.get('/api/**', (req, res) => {
    res.status(404).send('this data request is  not supported');
  });

// Example Express Rest API endpoints
// server.get('/api/**', (req, res) => { });
// Serve static files from /browser
  server.get('*.*', updateCookie, express.static(distFolder, {
    maxAge: '1y'
  }));

// All regular routes use the Universal engine
  server.get('*', updateCookie, (req, res) => {
    res.render(indexHtml, {req, providers: [{provide: APP_BASE_HREF, useValue: req.baseUrl}]});
  });

  return server;
}

function run(): void {
  const port = process.env.PORT || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';
