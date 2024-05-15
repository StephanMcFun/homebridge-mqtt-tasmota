var MqttTasmotaBaseAccessory = require('./accessory')

class MqttTasmotaEnergyAccessory extends MqttTasmotaBaseAccessory {
    constructor(log, config, api) {
        super(log, config, api)

        // TASMOTA vars
        this.mqttTeleTopic = config['teleTopic'] || this.buildTopic('tele', 'SENSOR')
        this.mqttCommandTopic = config['commandTopic'] || this.buildTopic('cmnd', 'TelePeriod')

        // STATE vars
        this.currentConsumption = 0.0;

        this.mqttClient.subscribe(this.mqttTeleTopic)

        // register the service and provide the callback functions
        this.service = new this.api.hap.Service.EnergySensor(this.name)
        this.service
            .getCharacteristic(this.api.hap.Characteristic.CurrentConsumption)
            .on('get', this.onGetCurrentConsumption.bind(this))

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

        this.currentConsumption = parseFloat(message['ENERGY']['Consumption'])
        this.service
            .getCharacteristic(this.api.hap.Characteristic.CurrentConsumption)
            .updateValue(this.currentConsumption)
        this.log('Updated CurrentConsumption: %f', this.currentConsumption)
    }

    // Homebridge handlers
    onGetCurrentConsumption(callback) {
        this.log('Requested CurrentConsumption: %f', this.currentConsumption)
        callback(this.currentStatusCode(), this.currentConsumption)
    }
}

module.exports = MqttTasmotaEnergyAccessory
