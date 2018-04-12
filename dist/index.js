"use strict";
exports.__esModule = true;
var _ = require("lodash");
var t = require("babel-types");
var helpers_1 = require("./helpers");
var babel_core_1 = require("babel-core");
var constants_1 = require("./constants");
function default_1() {
    return {
        visitor: {
            CallExpression: function (path, state) {
                var node = path.node;
                var callee = node.callee;
                var pluginOptions = state.opts;
                var isNejDefine = t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.object) &&
                    callee.object.name === constants_1.CONSTANTS.OBJECT_NAME &&
                    t.isIdentifier(callee.property) &&
                    callee.property.name === constants_1.CONSTANTS.DEFINE_NAME;
                var isDefine = t.isIdentifier(callee) && callee.name === constants_1.CONSTANTS.DEFINE_NAME;
                if (isNejDefine || isDefine) {
                    var functionDefinition_1;
                    var functionDefinitionPath_1;
                    var functionDefinitionVar_1;
                    var dependencyList_1 = [];
                    var moduleId_1;
                    _.forEach(node.arguments, function (arg, argIndex) {
                        if (helpers_1.isFunction(arg)) {
                            functionDefinition_1 = helpers_1.transformArrowFunctionToFunction(arg);
                            functionDefinitionPath_1 = path.get("arguments." + argIndex);
                        }
                        else if (t.isIdentifier(arg)) {
                            functionDefinitionVar_1 = arg;
                        }
                        else if (t.isArrayExpression(arg)) {
                            dependencyList_1 = arg.elements;
                            if (pluginOptions) {
                                if (!!pluginOptions.removeNejPlugins) {
                                    for (var _i = 0, dependencyList_2 = dependencyList_1; _i < dependencyList_2.length; _i++) {
                                        var dep = dependencyList_2[_i];
                                        if (dep) {
                                            dep.value = dep.value.replace(/^(.*?)\!/, '');
                                        }
                                    }
                                }
                                if (pluginOptions.nejPathAliases) {
                                    dependencyList_1 = _.map(dependencyList_1, function (dep) {
                                        dep.value = helpers_1.transformDependencyWithNejAliases(dep.value, pluginOptions.nejPathAliases);
                                        return dep;
                                    });
                                }
                            }
                        }
                        else if (t.isStringLiteral(arg)) {
                            moduleId_1 = arg;
                        }
                    });
                    if (!functionDefinition_1) {
                        if (functionDefinitionVar_1) {
                            var binding = void 0;
                            if (path.scope.parent && path.scope.parent.hasBinding(functionDefinitionVar_1.name)) {
                                binding = path.scope.parent.getBinding(functionDefinitionVar_1.name);
                            }
                            else {
                                binding = path.scope.getBinding(functionDefinitionVar_1.name);
                            }
                            if (binding) {
                                var bindingPath_1 = binding.path;
                                var fnDef_1;
                                var fnDefPath_1;
                                if (bindingPath_1.parentKey === 'params' && t.isFunctionExpression(bindingPath_1.parent)) {
                                    var argPos = _.findIndex(bindingPath_1.parent.params, function (param) { return param === bindingPath_1.node; });
                                    var firstCallExpParentPath = bindingPath_1.findParent(function (p) { return t.isCallExpression(p); });
                                    if (firstCallExpParentPath && t.isCallExpression(firstCallExpParentPath.node)) {
                                        var fn = firstCallExpParentPath.node.arguments[argPos];
                                        if (helpers_1.isFunction(fn)) {
                                            fnDef_1 = fn;
                                            fnDefPath_1 = firstCallExpParentPath.get("arguments." + argPos);
                                        }
                                    }
                                }
                                else if (t.isVariableDeclarator(bindingPath_1.node) &&
                                    helpers_1.isFunction(bindingPath_1.node.init)) {
                                    fnDef_1 = bindingPath_1.node.init;
                                    fnDefPath_1 = bindingPath_1.get("init");
                                }
                                else {
                                    babel_core_1.traverse(binding.path.scope.block, {
                                        AssignmentExpression: function (aePath) {
                                            var aeNode = aePath.node;
                                            if (t.isIdentifier(aeNode.left) &&
                                                functionDefinitionVar_1 &&
                                                aeNode.left.name === functionDefinitionVar_1.name &&
                                                helpers_1.isFunction(aeNode.right)) {
                                                fnDef_1 = aeNode.right;
                                                fnDefPath_1 = aePath.get('right');
                                                aePath.stop();
                                            }
                                        }
                                    }, binding.path.scope);
                                }
                                if (fnDef_1 && helpers_1.isFunction(fnDef_1) && fnDefPath_1) {
                                    functionDefinition_1 = helpers_1.transformArrowFunctionToFunction(fnDef_1);
                                    functionDefinitionPath_1 = fnDefPath_1;
                                }
                            }
                        }
                        else {
                            path.stop();
                            return;
                        }
                    }
                    if (!functionDefinition_1 || !functionDefinitionPath_1) {
                        path.stop();
                        return;
                    }
                    var firstInjectedIdentifier = void 0;
                    if (functionDefinition_1.params.length > dependencyList_1.length) {
                        firstInjectedIdentifier = functionDefinition_1.params[dependencyList_1.length];
                    }
                    var newFunctionDefinition = t.functionExpression(undefined, functionDefinition_1.params, t.blockStatement(_.map(_.slice(functionDefinition_1.params, dependencyList_1.length), function (id, paramIndex) {
                        return helpers_1.createInjectedNejParamAssignment(id.name, paramIndex);
                    })
                        .concat(functionDefinition_1.body.body)
                        .concat(firstInjectedIdentifier ? t.returnStatement(firstInjectedIdentifier) : [])));
                    if (pluginOptions && pluginOptions.bindWindowToThis) {
                        newFunctionDefinition = t.callExpression(t.memberExpression(newFunctionDefinition, t.identifier('bind')), [t.identifier('window')]);
                    }
                    if (functionDefinitionVar_1) {
                        functionDefinitionPath_1.replaceWith(newFunctionDefinition);
                    }
                    path.replaceWith(t.callExpression(t.identifier(constants_1.CONSTANTS.DEFINE_NAME), [
                        moduleId_1 || t.stringLiteral(''),
                        t.arrayExpression(dependencyList_1),
                        functionDefinitionVar_1 ? functionDefinitionVar_1 : newFunctionDefinition,
                    ]));
                    path.stop();
                }
            }
        }
    };
}
exports["default"] = default_1;
//# sourceMappingURL=index.js.map