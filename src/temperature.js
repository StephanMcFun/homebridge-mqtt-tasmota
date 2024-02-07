var MqttTasmotaBaseAccessory = require('./accessory')


class MqttTasmotaTemperatureAccessory extends MqttTasmotaBaseAccessory {

    constructor(log, config, api) {

        super(log, config, api)

        // TASMOTA vars
        this.mqttTeleTopic = config['teleTopic'] || this.buildTopic('tele', 'SENSOR')
        this.mqttCommandTopic = config['commandTopic'] || this.buildTopic('cmnd', 'TelePeriod')

        // STATE vars
        this.currentTemperature = -99.0; // last known temperature

        this.mqttClient.subscribe(this.mqttTeleTopic)

        // register the service and provide the callback functions
        this.service = new this.api.hap.Service.TemperatureSensor(this.name)
        this.service
            .getCharacteristic(this.api.hap.Characteristic.CurrentTemperature)
            .on('get', this.onGetCurrentTemperature.bind(this))

        // send an empty MQTT command to get the initial state
        this.mqttClient.publish(this.mqttCommandTopic, '1', this.mqttOptions)
    }

    // MQTT handler
    onMqttMessage(topic, message) {

        if (super.onMqttMessage(topic, message)) {
             return true
        }

        // message looks like this
        // {"Time":"2020-10-31T15:52:28","DS18B20":{"Temperature":18.5},"TempUnit":"C"}
        message = JSON.parse(message.toString('utf-8'))

        const sensors = ['DS18B20']

        for (let sensor of sensors) {

            if (message.hasOwnProperty(sensor)) {
                // update CurrentState
                this.currentTemperature = parseFloat(message[sensor]['Temperature'])
                this.service
                    .getCharacteristic(this.api.hap.Characteristic.CurrentTemperature)
                    .updateValue(this.currentTemperature)
                this.log('Updated CurrentTemperature: %f', this.currentTemperature)

                break
            }
        }
    }

    // Homebridge handlers
    onGetCurrentTemperature(callback) {
        this.log('Requested CurrentTemperature: %f', this.currentTemperature)
        callback(this.currentStatusCode(), this.currentTemperature)
    }
}

module.exports = MqttTasmotaTemperatureAccessory
