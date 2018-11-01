'use strict';

const fs = require('fs');
const plist = require('plist');
const homedir = require('os').homedir();

class Import {
  
  constructor(prompt) {
    this.sequelProFavorites   = `${homedir}/Library/Application Support/Sequel Pro/Data/Favorites.plist`;
    this.tablePlusConnections = `${homedir}/Library/Application Support/com.tinyapp.TablePlus/Data/Connections.plist`;
    this.tablePlusConnectionGroups = `${homedir}/Library/Application Support/com.tinyapp.TablePlus/Data/ConnectionGroups.plist`;
    this.newConnections = [];
    this.newGroups = [];

    if (prompt.confirmContinue) {
      this.backupConnections();
      this.buildConnections(this.plist(this.sequelProFavorites)["Favorites Root"]["Children"]);
      this.createGroups();
      this.mapConnections();

      this.writeFiles();
    }
  }

  /**
  * Backs up existing tablePlus plist files
  */
  backupConnections() {
    [this.tablePlusConnections, this.tablePlusConnectionGroups].forEach(file => {
      let oldFile, newFile;
      try {
        oldFile = fs.readFileSync(file, 'utf-8');
        newFile = fs.createWriteStream(`${file}.backup-${new Date().getTime()}`);
        oldFile.pipe(newFile);
      } catch(e) {}
    });
  }

  /**
  * Loops through exising Sequel Pro connections recursively (in case there are folders)
  */
  buildConnections(data, group = null) {
    data.forEach(val => {
      if (val.Children) {
        this.buildConnections(val.Children, val.Name);
      } else {
          this.newConnections.push({group: group, connections: val});
      }
    });
  }

  /**
  * Creates the necessary groups in tablePlus
  */
  createGroups() {
    [...new Set(this.newConnections.map(connection => connection.group))].forEach(group => {
      if (group) {
        this.newGroups.push({
          "ID": group,
          "IsExpanded": 0,
          "Name": group,
          "Connections": []
        });
      }
    });
  }

  /**
  * Maps the Sequel Pro fields to TablePlus
  */
  mapConnections() {
    let map = this.newConnections.map(connection => {
      if (!connection.connections.length) {
        return {
          "ConnectionName": connection.connections.name || "",
          "DatabaseHost": connection.connections.host || "",
          "DatabaseName": connection.connections.database || "",
          "DatabasePasswordMode": 0,
          "DatabasePath": "",
          "DatabasePort": connection.connections.port || "3306",
          "DatabaseSocket": connection.connections.socket || "",
          "DatabaseType": "",
          "DatabaseUser": connection.connections.user || "",
          "DatabaseUserRole": "",
          "Driver": "MySQL",
          "DriverVersion": 0,
          "Enviroment": "",
          "Favorites": {},
          "GroupID": connection.group || "",
          "ID": this.uuid(),
          "LimitRowsReturned": 0,
          "RecentlyOpened": [],
          "RecentlySchema": [],
          "ResourceFilePath": "",
          "SectionStates": {},
          "ServerAddress": connection.connections.sshHost  || "",
          "ServerPasswordMode": 0,
          "ServerPort": connection.connections.sshPort || "22",
          "ServerPrivateKeyName": "Import a private key...",
          "ServerUser": connection.connections.sshUser || "",
          "TlsKeyName": "Key...,Cert...,CA Cert...",
          "TlsKeyPaths": ["", "", ""],
          "isOverSSH": connection.connections.sshHost ? 1 : 0,
          "isUsePrivateKey": 1,
          "isUseResourceFile": 0,
          "isUseSocket": 0,
          "statusColor": "",
          "tLSMode": 0
        }
      }
    });

    this.newConnections = map;
  }

  /**
  * Writes the connections to file
  */
  writeFiles() {
    const newConnections = plist.build(this.newConnections);
    const newGroups = plist.build(this.newGroups);

    fs.writeFile(`${homedir}/Library/Application Support/com.tinyapp.TablePlus/Data/Connections.plist`, newConnections, (err) => {
      if (err) throw err;
      console.log('The connections have been saved!');
    });

    fs.writeFile(`${homedir}/Library/Application Support/com.tinyapp.TablePlus/Data/ConnectionGroups.plist`, newGroups, (err) => {
      if (err) throw err;
      console.log('The groups have been saved!');
    });
  }

  /**
  * Helper function to load plists
  */
  plist(file) {
    let contents;

    try {
      contents = fs.readFileSync(file, 'utf-8');
    } catch(e) {
      contents = plist.build([]);
    }

    return plist.parse(contents);
  }

  /**
  * UUID Generator
  */
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = Import;