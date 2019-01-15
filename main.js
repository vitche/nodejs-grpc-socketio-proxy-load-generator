const grpcSocketIoProxy = require('nodejs-grpc-socketio-proxy');

function Registry() {
    this.counter = {};
    this.add = function (event) {
        if (!this.counter[event]) {
            this.counter[event] = 0;
        }
        this.counter[event]++;
    };
    this.toJSON = function () {
        return JSON.stringify(this.counter);
    }
}

function Stream(registry, frequency) {
    let self = this;
    self.frequency = frequency;
    self.connect = function (host) {
        self.socket = grpcSocketIoProxy.ClientSocket.connect(host);
        self.socket.on('pong', function (data) {
            registry.add('pong', data);
        });
        self.socket.on('error', function (error) {
            registry.add('error', error);
        });
    };
    self.start = function () {
        this.interval = setInterval(function () {
                self.socket.emit('ping', {
                    testData: null
                });
            },
            1000 / self.frequency);
    };
}

function StreamPackage(registry, frequency, count) {
    this.streams = [];
    this.connect = function (host) {
        for (let i = 0; i < count; i++) {
            let stream = new Stream(registry, frequency);
            this.streams.push(stream);
            stream.connect(host);
        }
    };
    this.start = function () {
        for (let i = 0; i < this.streams.length; i++) {
            this.streams[i].start();
        }
    }
}

function Renderer(registry, interval) {
    this.start = function () {
        this.interval = setInterval(function () {
            console.log(registry.toJSON());
        }, interval)
    }
}

let registry = new Registry();

let renderer = new Renderer(registry, 1000);
renderer.start();

let streamPackage = new StreamPackage(registry, 100, 20);
streamPackage.connect('127.0.0.1:3001');
streamPackage.start();
