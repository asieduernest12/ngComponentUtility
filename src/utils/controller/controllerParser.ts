import * as ts from 'typescript';
import _ = require('lodash');
import { SourceFile } from '../sourceFile';
import { Controller } from './controller';
import { ClassMethod } from './method';
import { ClassProperty } from './property';
import { isAngularModule } from '../typescriptParser';
import { IMember } from './member';

export class ControllerParser {
	private results: Controller[] = [];

	constructor(private file: SourceFile) {
	}

	public parse = () => {
		this.parseChildren(this.file.sourceFile);

		return this.results;
	}

	private parseChildren = (node: ts.Node) => {
		if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
			const functionDeclaration = node as ts.FunctionDeclaration;

			const controller = new Controller();
			controller.path = this.file.path;
			controller.name = controller.className = functionDeclaration.name.text;
			controller.pos = this.file.sourceFile.getLineAndCharacterOfPosition(functionDeclaration.name.pos);
			controller.members = this.retrieveFunctionDeclarationMembers(functionDeclaration, controller);


			this.results.push(controller);
		} else if (this.isControllerClass(node)) {
			const controller = this.parseControllerClass(node);

			this.results.push(controller);
		} else if (node.kind === ts.SyntaxKind.CallExpression) {
			const call = node as ts.CallExpression;

			if (isAngularModule(call.expression)) {
				const controllerCall = this.findControllerRegistration(call.parent);
				if (controllerCall) {
					const controllerName = controllerCall.arguments[0] as ts.StringLiteral;
					const controllerIdentifier = controllerCall.arguments[1] as ts.Identifier;

					if (controllerName.text !== controllerIdentifier.text) {
						const ctrl = this.results.find(c => c.className === controllerIdentifier.text);
						if (ctrl) {
							ctrl.name = controllerName.text;
						}
					}
				}
			} else {
				node.getChildren().forEach(this.parseChildren);
			}
		} else {
			node.getChildren().forEach(this.parseChildren);
		}
	}

	public parseControllerClass(node: ts.ClassDeclaration) {
		const controller = new Controller();
		controller.path = this.file.path;
		controller.name = controller.className = node.name.text;
		controller.pos = this.file.sourceFile.getLineAndCharacterOfPosition(node.members.pos);
		controller.baseClassName = this.getBaseClassName(node);
		controller.members = [
			...node.members.map(m => this.createMember(controller, m)).filter(item => item),
			...this.getConstructorMembers(controller, node.members)
		];

		return controller;
	}

	private findControllerRegistration = (node: ts.Node): ts.CallExpression => {
		if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
			const pae = node as ts.PropertyAccessExpression;
			if (pae.name.text === 'controller' && pae.parent && pae.parent.kind === ts.SyntaxKind.CallExpression) {
				const call = pae.parent as ts.CallExpression;
				if (call.arguments.length === 2) {
					return call;
				}
			}
		}

		if (node.parent) {
			return this.findControllerRegistration(node.parent);
		}
	}

	private createMember = (controller: Controller, member: ts.ClassElement) => {
		if (ts.isMethodDeclaration(member)) {
			return ClassMethod.fromNode(controller, member, this.file.sourceFile);
		} else if (ts.isGetAccessorDeclaration(member)) {
			return ClassProperty.fromProperty(controller, member, this.file.sourceFile);
		} else if (ts.isPropertyDeclaration(member)) {
			if (member.initializer && member.initializer.kind === ts.SyntaxKind.ArrowFunction) {
				return ClassMethod.fromNode(controller, member, this.file.sourceFile);
			} else {
				return ClassProperty.fromProperty(controller, member, this.file.sourceFile);
			}
		}
	}

	private getConstructorMembers = (controller: Controller, members: ts.NodeArray<ts.ClassElement>): ClassProperty[] => {
		const ctor = members.find((m: ts.ClassElement): m is ts.ConstructorDeclaration => m.kind === ts.SyntaxKind.Constructor);

		if (ctor) {
			return ctor.parameters.filter(p => p.modifiers).map(p => ClassProperty.fromConstructorParameter(controller, p, this.file.sourceFile));
		}

		return [];
	}

	private getBaseClassName = (classDeclaration: ts.ClassDeclaration): string => {
		if (classDeclaration.heritageClauses) {
			const extendsClause = classDeclaration.heritageClauses.find(hc => hc.token === ts.SyntaxKind.ExtendsKeyword);

			if (extendsClause && extendsClause.types.length === 1) {
				const typeExpression = extendsClause.types[0].expression;

				if (ts.isPropertyAccessExpression(typeExpression)) {
					return typeExpression.name.text;
				}

				return typeExpression.getText();
			}
		}
	}

	private isControllerClass(node: ts.Node): node is ts.ClassDeclaration {
		return ts.isClassDeclaration(node) && !this.implementsComponentOptions(node);
	}

	private implementsComponentOptions(classDeclaration: ts.ClassDeclaration) {
		if (!classDeclaration.heritageClauses) {
			return false;
		}

		const typeNames = _.flatMap(classDeclaration.heritageClauses, x => x.types.map(t => t.getText()));

		return typeNames.some(t => t.includes('IComponentOptions'));
	}

	private retrieveFunctionDeclarationMembers(functionDeclaration: ts.FunctionDeclaration, controller: Controller): IMember[] {
		// If the function declaration has no body, return an empty array.
		if (!functionDeclaration.body) {
			return [];
		}

		let memberDecs: Array<ClassProperty|ClassMethod> = [];

		// Define a variable to hold the name of the variable that 'this' is assigned to.
		let thisAlias: string | null = null;

		for (let statement of functionDeclaration.body.statements) {

			// check if this is VariableStatement reassigning this to a variable
			if (ts.isVariableStatement(statement)) {
				const declaration = statement.declarationList.declarations[0];
				const isThis = declaration.initializer && (ts.SyntaxKind.ThisKeyword === declaration.initializer.kind)
				if (isThis) {
					thisAlias = declaration.name.getText();
				}
			}

			// If the statement is not an expression statement or the expression is not a binary expression, continue to the next statement.
			if (!ts.isExpressionStatement(statement) || !ts.isBinaryExpression(statement.expression) || !ts.isPropertyAccessExpression(statement.expression.left)) {
				continue;
			}



			// If the left side of the binary expression is not a property access expression, continue to the next statement.
			if (!ts.isPropertyAccessExpression(statement.expression.left)) {
				continue;
			}

			// Check if the left side of the binary expression is a 'this' keyword or the alias of 'this'.
			if (statement.expression.left.expression.kind !== ts.SyntaxKind.ThisKeyword &&
				statement.expression.left.name.text !== thisAlias) {
				continue;
			}
			
			// check if right side is arrow function
			if (ts.isArrowFunction(statement.expression.right)) {
				memberDecs.push(ClassMethod.fromFNode(controller, statement.expression, this.file.sourceFile))
			}

			// check if statement is a function declaration then recursively call retrieveFunctionDeclarationMembers
			// if (ts.isFunctionDeclaration(statement.expression.right) || ts.isFunctionLike(statement.expression.right)) {
			// 	const _members = this.retrieveFunctionDeclarationMembers(statement.expression.right, controller);
			// 	memberDecs.push(..._members);
			// }

			// check if not arrow or function expression
			if (!ts.isArrowFunction(statement.expression.right) && !ts.isFunctionExpression(statement.expression.right)) {
				memberDecs.push(ClassProperty.fromFProperty(controller, statement.expression, this.file.sourceFile))
			}




			// If all conditions are met, add the name of the property and its initializer to the members array.
			//   memberDecs.push({ name: statement.expression.left.name.text, value: statement.expression.right });
			// memberDecs.push([controller,statement]);
			// memberDecs.push(this.createMember(controller, statement.expression.left))
		}
		// return memberDecs.map(([controller,memberStmt])=> this.createMember(controller,memberStmt.expression?.left))

		return memberDecs;
	}

	private retrieveFunctionDeclarationMembersX(functionDeclaration: ts.FunctionDeclaration, controller: Controller): IMember[] {
		// If the function declaration has no body or statements, return an empty array.
		if (!functionDeclaration.body || !functionDeclaration.body.statements) {
			return [];
		}

		// // Create a new Controller instance from the function declaration.
		// const controller = Controller.fromNode(functionDeclaration, sourceFile);

		// let members = functionDeclaration.body.statements.map(statement => {
		//   // If the statement is a class element, use the createMember function to create an IMember.
		//   if (ts.isClassElement(statement)) {
		// 	return this.createMember(controller, statement);
		//   }
		// });

		// // Filter out any undefined members (in case createMember returned undefined for any members).
		// members = members.filter(member => member !== undefined);

		const statements = functionDeclaration.body.statements
			// filter for property declaration
			.filter(statement => ts.isPropertyDeclaration(statement))

		const members = statements.map(statement => {
			// If the statement is a class element, use the createMember function to create an IMember.
			if (ts.isClassElement(statement)) {
				return this.createMember(controller, statement);
			}
		})

		return members;
	}
}
