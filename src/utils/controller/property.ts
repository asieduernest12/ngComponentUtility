import * as ts from 'typescript';
import * as vsc from 'vscode';
import { MemberType, MemberBase } from './member';
import { IComponentBinding } from '../component/component';
import { Controller } from './controller';

export class ClassProperty extends MemberBase {
	public name: string;
	public readonly type: MemberType = MemberType.Property;

	private constructor(controller: Controller) {
		super(controller);
	}

	public static fromProperty(controller: Controller, node: ts.PropertyDeclaration | ts.GetAccessorDeclaration, sourceFile: ts.SourceFile) {
		const result = new ClassProperty(controller);
		result.fillCommonFields(node, sourceFile);

		return result;
	}

	private static getProgram(sourceFile: ts.SourceFile):ts.Program {
		return ts.createProgram([sourceFile], {});
	}
	
	public static fromFProperty(controller: Controller, node: ts.BinaryExpression, sourceFile: ts.SourceFile) {
		const result = new ClassProperty(controller);
		result.fillCommonFields(node.left, sourceFile);
		
		const checker = ClassProperty.getProgram(sourceFile.fullpath).getTypeChecker();
		const type = checker.getTypeAtLocation(node.right)
		switch (type.flags) {
			case ts.TypeFlags.String:
				result.returnType = 'string';
				break;
			case ts.TypeFlags.Number:
				result.returnType = 'number';
				break;
			case ts.TypeFlags.Boolean:
				result.returnType = 'boolean';
				break;
			default:
				result.returnType = checker.typeToString(type);
		}
		return result;
	}

	public static fromConstructorParameter(controller: Controller, node: ts.ParameterDeclaration, sourceFile: ts.SourceFile) {
		const result = new ClassProperty(controller);
		result.fillCommonFields(node, sourceFile);

		return result;
	}

	public buildCompletionItem(bindings: IComponentBinding[]) {
		const item = this.createCompletionItem();
		item.kind = vsc.CompletionItemKind.Field;
		item.documentation = 'Type: ' + this.returnType || 'any';

		const binding = bindings.find(b => b.name === this.name);
		if (binding) {
			item.detail += `\r\nBinding: ${binding.type}`;
			item.kind = vsc.CompletionItemKind.Reference;
		}

		return item;
	}
}
