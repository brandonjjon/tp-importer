'use strict';

const fs = require('fs');
const plist = require('plist');
const homedir = require('os').homedir();

class Import {

  constructor(prompt) {
    this.favoritesToImport = prompt.importFrom === 'sequelpro' ?
      `${homedir}/Library/Application Support/Sequel Pro/Data/Favorites.plist` :
      `${homedir}/Library/Containers/com.sequel-ace.sequel-ace/Data/Library/Application Support/Sequel Ace/Data/Favorites.plist`;
      console.log(prompt);
    this.tablePlusConnections = prompt.importTo === 'standalone' ?
      `${homedir}/Library/Application Support/com.tinyapp.TablePlus/Data/Connections.plist` :
      `${homedir}/Library/Application Support/com.tinyapp.TablePlus-setapp/Data/Connections.plist`;
      console.log(this.tablePlusConnections);
    this.tablePlusConnectionGroups = prompt.importTo === 'standalone' ?
      `${homedir}/Library/Application Support/com.tinyapp.TablePlus/Data/ConnectionGroups.plist` :
      `${homedir}/Library/Application Support/com.tinyapp.TablePlus-setapp/Data/ConnectionGroups.plist`;
    this.newConnections = [];
    this.newGroups = [];

    if (prompt.confirmContinue) {
      this.backupConnections();
      this.buildConnections(this.plist(this.favoritesToImport)["Favorites Root"]["Children"]);
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

        let statusColor='';
        
        switch(connection.connections.colorIndex) {
        	// red
        	case 0:
            statusColor='#FFD7D4';
        	break;
        	
        	// orange
        	case 1:
            statusColor='#FFD78A';
        	break;
        	
        	// yellow
        	case 2:
            statusColor='#F8F7BD';
        	break;
        	
        	// green
        	case 3:
            statusColor='#DAEBC2';
        	break;
        	
        	// blue
        	case 4:
            statusColor='#B2D5FF';
        	break;
        	
        	// purple
        	case 5:
            statusColor='#E2BBFF';
        	break;
        	
        	// gray
        	case 6:
            statusColor='#F8F8F8';
        	break;
        }
      
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
          "statusColor": statusColor,
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

    fs.writeFile(this.tablePlusConnections, newConnections, (err) => {
      if (err) throw err;
      console.log('The connections have been saved!');
    });

    fs.writeFile(this.tablePlusConnectionGroups, newGroups, (err) => {
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
