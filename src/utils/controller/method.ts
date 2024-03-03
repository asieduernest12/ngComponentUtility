import * as ts from 'typescript';
import * as vsc from 'vscode';
import { MemberType, MemberBase } from './member';
import { IComponentBinding } from '../component/component';
import { Controller } from './controller';

export class ClassMethod extends MemberBase {
	public name: string;
	public readonly type = MemberType.Method;
	public parameters: IParameter[] = [];

	private constructor(controller: Controller) {
		super(controller);
	}

	public static fromNode(controller: Controller, node: ts.PropertyDeclaration | ts.MethodDeclaration, sourceFile: ts.SourceFile) {
		const result = new ClassMethod(controller);
		result.fillCommonFields(node, sourceFile);

		if (isProperty(node)) {
			const initializer = node.initializer as ts.ArrowFunction;
			result.setReturnType(initializer.type);
			result.parameters = initializer.parameters.map(this.createParameter);
		} else {
			result.parameters = node.parameters.map(this.createParameter);
		}

		return result;
	}

	private static getProgram(sourceFile: ts.SourceFile):ts.Program {
		return ts.createProgram([sourceFile], {});
	}
	
	public static fromFNode(controller: Controller, node: ts.BinaryExpression, sourceFile: ts.SourceFile) {
		const result = new ClassMethod(controller);
		result.fillCommonFields(node.left, sourceFile);
		// result.setReturnType(node.right.type as ts.TypeNode);
		// const checker = ClassMethod.getProgram(sourceFile.fullpath).getTypeChecker();
		// result.returnType = ts.createArrowFunction([], [], [], node.right.type as ts.TypeNode, undefined, undefined).getText();
		

		if (isProperty(node.right)) {
			const initializer = node.right.initializer as ts.ArrowFunction;
			result.setReturnType(initializer.type);
			result.parameters = initializer.parameters.map(this.createParameter);
		} else {
			result.parameters = node.right.parameters.map(this.createParameter);
		}

		return result;
	}

	private static createParameter = (p: ts.ParameterDeclaration): IParameter => {
		return {
			name: p.name.getText(),
			type: p.type && p.type.getText() || 'any'
		};
	}

	public buildCompletionItem(_bindings: IComponentBinding[]) {
		const item = this.createCompletionItem();
		item.kind = vsc.CompletionItemKind.Function;
		item.documentation = `${this.name}(${this.parameters.map(p => p.name + ': ' + p.type).join(', ')}): ${this.returnType}`;

		return item;
	}
}

function isProperty(node: ts.PropertyDeclaration | ts.MethodDeclaration): node is ts.PropertyDeclaration {
	return (node as ts.PropertyDeclaration).initializer !== undefined;
}

interface IParameter {
	name: string;
	type: string;
}
