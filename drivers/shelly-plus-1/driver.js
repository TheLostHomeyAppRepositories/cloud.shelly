'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPlus1Driver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plus 1',
      battery: false,
      gen: 'gen2',
      communication: 'websocket',
      hostname: ['shellyplus1-', 'ShellyPlus1-'],
      code: ['SNSW-001X16EU']
    }
  }

}

module.exports = ShellyPlus1Driver;
