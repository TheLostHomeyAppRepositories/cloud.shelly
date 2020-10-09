'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const tinycolor = require("tinycolor2");
const callbacks = [
  'btn_on',
  'btn_off',
  'btn_longpush',
  'btn_shortpush',
  'out_on',
  'out_off'
];

class ShellyRGBW2ColorDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // ADD OR REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (!this.hasCapability('button.callbackevents')) {
      this.addCapability('button.callbackevents');
    }
    if (!this.hasCapability('button.removecallbackevents')) {
      this.addCapability('button.removecallbackevents');
    }
    if (!this.hasCapability('meter_power')) {
      this.addCapability('meter_power');
    }
    if (!this.hasCapability('alarm_generic')) {
      this.addCapability('alarm_generic');
    }

    // UPDATE INITIAL STATE
    this.initialStateUpdate();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const path = value ? '/color/0?turn=on' : '/color/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('dim', async (value) => {
      const dim = value * 100;
      return await this.util.sendCommand('/color/0?gain='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('light_temperature', async (value) => {
      const white = Number(this.util.denormalize(value, 0, 255));
      this.setCapabilityValue("light_mode", 'temperature');
      return await this.util.sendCommand('/color/0?white='+ white, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerMultipleCapabilityListener(['light_hue', 'light_saturation' ], async ( valueObj, optsObj ) => {
      if (typeof valueObj.light_hue !== 'undefined') {
        var hue_value = valueObj.light_hue;
      } else {
        var hue_value = this.getCapabilityValue('light_hue');
      }
      if (typeof valueObj.light_saturation !== 'undefined') {
        var saturation_value = valueObj.light_saturation;
      } else {
        var saturation_value = this.getCapabilityValue('light_saturation');
      }
      let color = tinycolor.fromRatio({ h: hue_value, s: saturation_value, v: this.getCapabilityValue('dim') });
      let rgbcolor = color.toRgb();
      this.setCapabilityValue("light_mode", 'color');
      return await this.util.sendCommand('/color/0?red='+ Number(rgbcolor.r) +'&green='+ Number(rgbcolor.g) +'&blue='+ Number(rgbcolor.b) +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    }, 500);

    this.registerCapabilityListener('onoff.whitemode', async (value) => {
      if (value) {
        this.setCapabilityValue("light_mode", 'temperature');
        return await this.util.sendCommand('/color/0?gain=0&white=255', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        this.setCapabilityValue("light_mode", 'color');
        return await this.util.sendCommand('/color/0?gain=100&white=0', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings/color/0?', callbacks, 'shellyrgbw2color', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings/color/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    return await this.homey.app.updateShellyCollection();
  }

  async onDeleted() {
    try {
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeIcon(iconpath);
      await this.homey.app.updateShellyCollection();
      return;
    } catch (error) {
      this.log(error);
    }
  }

  // HELPER FUNCTIONS
  async initialStateUpdate() {
    try {
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 'polling');
      if (!this.getAvailable()) { this.setAvailable(); }
      let onoff = result.ison;
      let dim = result.gain / 100;
      let light_temperature = 1 - Number(this.util.normalize(result.white, 0, 255));
      let color = tinycolor({r: result.red, g: result.green, b: result.blue});
      let hsv = color.toHsv();
      let light_hue = Number((hsv.h / 360).toFixed(2));
      let measure_power = result.meters[0].power;
      let meter_power = result.meters[0].total * 0.000017;
      let alarm_generic = results.inputs[0].input === 1 ? true : false;

      // capability onoff
      if (onoff != this.getCapabilityValue('onoff')) {
        this.setCapabilityValue('onoff', onoff);
      }

      // capability dim
      if (dim != this.getCapabilityValue('dim')) {
        this.setCapabilityValue('dim', dim);
      }

      // capability light_temperature
      if (light_temperature != this.getCapabilityValue('light_temperature')) {
        this.setCapabilityValue('light_temperature', light_temperature);
      }

      // capability light_hue
      if (light_hue != this.getCapabilityValue('light_hue')) {
        this.setCapabilityValue('light_hue', light_hue);
      }

      // capability light_saturation
      if (hsv.s != this.getCapabilityValue('light_saturation')) {
        this.setCapabilityValue('light_saturation', hsv.s);
      }

      // capability measure_power
      if (measure_power != this.getCapabilityValue('measure_power')) {
        this.setCapabilityValue('measure_power', measure_power);
      }

      // capability measure_power
      if (meter_power != this.getCapabilityValue('meter_power')) {
        this.setCapabilityValue('meter_power', meter_power);
      }

      // capability alarm_generic
      if (alarm_generic != this.getCapabilityValue('alarm_generic')) {
        this.setCapabilityValue('alarm_generic', alarm_generic);
      }

      //capability white_mode
      if (Number(result.white) > 220 && !this.getCapabilityValue('onoff.whitemode')) {
        this.setCapabilityValue('onoff.whitemode', true);
      } else if (Number(result.gain) > 10 && Number(result.white) <= 220 && this.getCapabilityValue('onoff.whitemode')) {
        this.setCapabilityValue('onoff.whitemode', false);
      }

    } catch (error) {
      this.setUnavailable(this.homey.__('device.unreachable') + error.message);
      this.log(error);
    }
  }

  async deviceCoapReport(capability, value) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }
      
      switch(capability) {
        case 'switch':
          if (value != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', value);
          }
          break;
        case 'white':
          let light_temperature = 1 - Number(this.util.normalize(value, 0, 255));
          if (light_temperature != this.getCapabilityValue('light_temperature')) {
            this.setCapabilityValue('light_temperature', light_temperature);
          }
          if (value > 220 && !this.getCapabilityValue('onoff.whitemode')) {
            this.setCapabilityValue('onoff.whitemode', true);
          } else if (value > 10 && value <= 220 && this.getCapabilityValue('onoff.whitemode')) {
            this.setCapabilityValue('onoff.whitemode', false);
          }
          break;
        case 'gain':
          let dim = value >= 100 ? 1 : value / 100;
          if (dim != this.getCapabilityValue('dim')) {
            this.setCapabilityValue('dim', dim);
          }
          break;
        case 'power0':
          if (value != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', value);
          }
          break;
        case 'energyCounter0':
          let meter_power = value * 0.000017;
          if (meter_power != this.getCapabilityValue('meter_power')) {
            this.setCapabilityValue('meter_power', meter_power);
          }
          break;
        case 'red':
          this.setStoreValue('red', value);
          this.updateDeviceRgb();
          break;
        case 'green':
          this.setStoreValue('green', value);
          this.updateDeviceRgb();
          break;
        case 'blue':
          this.setStoreValue('blue', value);
          this.updateDeviceRgb();
          break;
        case 'mode':
          let light_mode = value === 'white' ? 'temperature' : 'color';
          if (light_mode != this.getCapabilityValue('light_mode')) {
            this.setCapabilityValue('light_mode', light_mode);
          }
          break;
        case 'input0':
          let alarm = value === 0 ? false : true;
          if (alarm != this.getCapabilityValue('alarm_generic')) {
            this.setCapabilityValue('alarm_generic', alarm);
          }
          break;
        default:
          this.log('Device does not support reported capability.');
      }
      return Promise.resolve(true);
    } catch(error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

  updateDeviceRgb() {
    clearTimeout(this.updateDeviceRgbTimeout);

    this.updateDeviceRgbTimeout = setTimeout(() => {
      let color = tinycolor({ r: this.getStoreValue('red'), g: this.getStoreValue('green'), b: this.getStoreValue('blue') });
      let hsv = color.toHsv();
      let light_hue = Number((hsv.h / 360).toFixed(2));
      if (light_hue !== this.getCapabilityValue('light_hue')) {
        this.setCapabilityValue('light_hue', light_hue);
      }
      if (hsv.v !== this.getCapabilityValue('light_saturation')) {
        this.setCapabilityValue('light_saturation', hsv.v);
      }
    }, 2000);
  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = ShellyRGBW2ColorDevice;
