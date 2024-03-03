// const template = require('./template.html');
import template from './template.html';

class Controller {
    public name = 'sing'
    constructor() {

    }
}

function theController() {
    // prop declaration
    /** @type {string} */
    this.name = 'namee'
    this.age = 'age'
    this.person = { country: 1, age: 5 }

    this.getName = () => this.name

    // private field declaration and this reassignment
    const vm = this
    const ship = { name: '' }

    // method declaration
    this.getCaptilizedName = function () {
        // declaration
        vm.captilized = true;
        return vm.name.toUpperCase();
    }

    function privateFunc() {
        console.log('privateFunc declaration')
    }

    const constPriveFunction = () => console.log('constPrivFunction')

    vm.pubSing = () => {
        console.log('singing')
    }

    vm['pubElmAccess'] = function () {
        console.log('all')
    }

    ship['pubId'] = () => {
        console.log('id')
    }
}
const comp = {
    template: template,
    // templateUrl:'./template.html',
    // template: ()=>template,
    // template: '',
    // template,
    // template:require('./template-imported.html'),
    bindings: {
        data: '<'
    },
    // controller: Controller,
    controller: theController
    // controller:function(){}
}
angular.module('moduleName')
    // .controller('theController',theController)
    // angular.module('moduleName') 
    .component('componentNameImported', comp);
