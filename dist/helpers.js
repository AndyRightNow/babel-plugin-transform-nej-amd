"use strict";
exports.__esModule = true;
var t = require("babel-types");
var lodash_1 = require("lodash");
function createInjectedNejParamAssignment(varName, index) {
    var rightHandSide = t.objectExpression([]);
    switch (index) {
        case 2:
            rightHandSide = t.functionExpression(undefined, [], t.blockStatement([]));
            break;
        case 3:
            rightHandSide = t.arrayExpression([]);
            break;
    }
    return t.expressionStatement(t.assignmentExpression('=', t.identifier(varName), rightHandSide));
}
exports.createInjectedNejParamAssignment = createInjectedNejParamAssignment;
function transformArrowFunctionToFunction(arrowFunction) {
    var functionBody;
    if (t.isFunctionExpression(arrowFunction)) {
        return arrowFunction;
    }
    if (t.isExpression(arrowFunction.body)) {
        functionBody = t.blockStatement([t.returnStatement(arrowFunction.body)]);
    }
    else {
        functionBody = arrowFunction.body;
    }
    return t.functionExpression(undefined, arrowFunction.params, functionBody);
}
exports.transformArrowFunctionToFunction = transformArrowFunctionToFunction;
function isFunction(node) {
    return t.isFunctionExpression(node) || t.isArrowFunctionExpression(node);
}
exports.isFunction = isFunction;
function transformDependencyWithNejAliases(dependencyDir, nejAliases) {
    if (!nejAliases) {
        return dependencyDir;
    }
    lodash_1.forOwn(nejAliases, function (mappedPath, alias) {
        var aliasRE = new RegExp("({" + alias + "})|(^" + alias + ")(?:[\\/]+)");
        dependencyDir = dependencyDir.replace(aliasRE, function (matched, p1, p2) {
            if (p1) {
                return matched.replace(p1, mappedPath);
            }
            else if (p2) {
                return matched.replace(p2, mappedPath);
            }
            else {
                return matched;
            }
        });
    });
    return dependencyDir.replace(/[\/\\]+/g, '/');
}
exports.transformDependencyWithNejAliases = transformDependencyWithNejAliases;
//# sourceMappingURL=helpers.js.map