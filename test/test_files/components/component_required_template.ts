let template = require('./testTemplate.html');

function controller() {}

angular.module('moduleName').component('componentName2', {
    template: template,
    bindings: {
        data: '<'
    },
    controller: controller
}); 