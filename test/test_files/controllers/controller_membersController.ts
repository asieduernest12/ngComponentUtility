import angular from 'angular';

/* tslint:disable */
export class TestController {
	private privateField: string;
	public publicField: string;
	implicitlyPublicField: string;
	customType: IReturnType;

	testMethod(p1: string): number {
		return 0;
	}

	arrowFunction = (p1: string, p2: number): number => {
		return 1;
	}
}

// angular.module('app').controller('TestController', TestController);

// export function TestController2 {
// 	const privateField: string;
// 	this.publicField: string;
// 	this.implicitlyPublicField: string;
// 	this.customType: IReturnType;

// 	this.testMethod(p1: string): number {
// 		return 0;
// 	}

// 	this.arrowFunction = (p1: string, p2: number): number => {
// 		return 1;
// 	}
// }

// angular.module('app').controller('TestController2', TestController2);

interface IReturnType {
	field: string;
}