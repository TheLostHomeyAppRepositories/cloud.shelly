'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly3EmDevice extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerMeterPowerConsumed').register();
    new Homey.FlowCardTriggerDevice('triggerMeterPowerReturned').register();
    new Homey.FlowCardTriggerDevice('triggerMeterPowerFactor').register();
    new Homey.FlowCardTriggerDevice('triggerBtnAction').register();

    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      Homey.ManagerDrivers.getDriver('shelly3em').updateTempDevices(this.getData().id, 'onoff', value);
      if (value) {
        return util.sendCommand('/relay/0?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/relay/0?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('button.triggers', async () => {
      var homeyip = await util.getHomeyIp();
      var out_on_url = '/settings/relay/'+ this.getStoreValue('channel') +'?out_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shelly3em/'+ this.getData().id +'/out_on/';
      var out_off_url = '/settings/relay/'+ this.getStoreValue('channel') +'?out_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shelly3em/'+ this.getData().id +'/out_off/';

      try {
        await util.sendCommand(out_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

    this.registerCapabilityListener('button.removetriggers', async () => {
      var out_on_url = '/settings/relay/'+ this.getStoreValue('channel') +'?out_on_url=null';
      var out_off_url = '/settings/relay/'+ this.getStoreValue('channel') +'?out_off_url=null';

      try {
        await util.sendCommand(out_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

  }

  onDeleted() {
    return Homey.ManagerDrivers.getDriver('shelly3em').loadDevices();
  }

  triggerActions(action) {
    return Homey.ManagerFlow.getCard('trigger', "triggerBtnAction").trigger(this, {"action": action}, {})
  }

}

module.exports = Shelly3EmDevice;
