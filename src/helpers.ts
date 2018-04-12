import * as t from 'babel-types';
import { forOwn } from 'lodash';

export function createInjectedNejParamAssignment(varName: string, index: number): t.Statement {
    let rightHandSide: t.FunctionExpression | t.ObjectExpression | t.ArrayExpression = t.objectExpression([]);

    switch (index) {
        // Injected function
        case 2:
            rightHandSide = t.functionExpression(undefined, [], t.blockStatement([]));
            break;
        // Injected array
        case 3:
            rightHandSide = t.arrayExpression([]);
            break;
    }

    return t.expressionStatement(t.assignmentExpression('=', t.identifier(varName), rightHandSide));
}

export function transformArrowFunctionToFunction(
    arrowFunction: t.ArrowFunctionExpression | t.FunctionExpression,
): t.FunctionExpression {
    let functionBody: t.BlockStatement;

    if (t.isFunctionExpression(arrowFunction)) {
        return arrowFunction;
    }

    if (t.isExpression(arrowFunction.body)) {
        functionBody = t.blockStatement([t.returnStatement(arrowFunction.body)]);
    } else {
        functionBody = arrowFunction.body;
    }

    return t.functionExpression(undefined, arrowFunction.params, functionBody);
}

export function isFunction(node: t.Node): node is t.FunctionExpression | t.ArrowFunctionExpression {
    return t.isFunctionExpression(node) || t.isArrowFunctionExpression(node);
}

export function transformDependencyWithNejAliases(
    dependencyDir: string,
    nejAliases?: { [alias: string]: string },
): string {
    if (!nejAliases) {
        return dependencyDir;
    }

    forOwn(nejAliases, (mappedPath: string, alias: string) => {
        const aliasRE = new RegExp(`(\{${alias}\})|(^${alias})(?:[\\\/]+)`);

        dependencyDir = dependencyDir.replace(aliasRE, (matched: string, p1: string, p2: string) => {
            if (p1) {
                return matched.replace(p1, mappedPath);
            } else if (p2) {
                return matched.replace(p2, mappedPath);
            } else {
                return matched;
            }
        });
    });

    return dependencyDir.replace(/[\/\\]+/g, '/');
}
