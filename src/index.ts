import * as _ from 'lodash';
import * as babel from 'babel-core';
import * as t from 'babel-types';

import { NodePath, Binding } from 'babel-traverse';

import {
    createInjectedNejParamAssignment,
    transformArrowFunctionToFunction,
    isFunction,
    transformDependencyWithNejAliases,
} from './helpers';
import { traverse } from 'babel-core';
import { CONSTANTS } from './constants';

interface IPluginOptions {
    removeNejPlugins?: boolean;
    nejPathAliases?: {
        [alias: string]: string;
    };
    bindWindowToThis?: boolean;
}

export default function(): babel.PluginObj {
    return {
        visitor: {
            CallExpression(path: NodePath<t.CallExpression>, state: { opts?: IPluginOptions }) {
                const node = path.node;
                const callee = node.callee;
                const pluginOptions = state.opts;
                const isNejDefine =
                    t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.object) &&
                    callee.object.name === CONSTANTS.OBJECT_NAME &&
                    t.isIdentifier(callee.property) &&
                    callee.property.name === CONSTANTS.DEFINE_NAME;
                const isDefine = t.isIdentifier(callee) && callee.name === CONSTANTS.DEFINE_NAME;

                // Get NEJ module function definition
                if (isNejDefine || isDefine) {
                    let functionDefinition: t.FunctionExpression | undefined;
                    let functionDefinitionPath: NodePath<t.FunctionExpression | t.ArrowFunctionExpression> | undefined;
                    let functionDefinitionVar: t.Identifier | undefined;
                    let dependencyList: t.StringLiteral[] = [];
                    let moduleId: t.StringLiteral | undefined;

                    _.forEach(node.arguments, (arg, argIndex) => {
                        if (isFunction(arg)) {
                            functionDefinition = transformArrowFunctionToFunction(arg);
                            functionDefinitionPath = path.get(`arguments.${argIndex}`) as typeof functionDefinitionPath;
                        } else if (t.isIdentifier(arg)) {
                            functionDefinitionVar = arg;
                        } else if (t.isArrayExpression(arg)) {
                            dependencyList = (arg as t.ArrayExpression).elements as typeof dependencyList;

                            if (pluginOptions) {
                                if (!!pluginOptions.removeNejPlugins) {
                                    for (const dep of dependencyList) {
                                        if (dep) {
                                            dep.value = dep.value.replace(/^(.*?)\!/, '');
                                        }
                                    }
                                }

                                if (pluginOptions.nejPathAliases) {
                                    dependencyList = _.map(dependencyList, dep => {
                                        dep.value = transformDependencyWithNejAliases(
                                            dep.value,
                                            pluginOptions.nejPathAliases,
                                        );

                                        return dep;
                                    });
                                }
                            }
                        } else if (t.isStringLiteral(arg)) {
                            moduleId = arg;
                        }
                    });

                    if (!functionDefinition) {
                        if (functionDefinitionVar) {
                            let binding: Binding | undefined;

                            if (path.scope.parent && path.scope.parent.hasBinding(functionDefinitionVar.name)) {
                                binding = path.scope.parent.getBinding(functionDefinitionVar.name);
                            } else {
                                binding = path.scope.getBinding(functionDefinitionVar.name);
                            }

                            if (binding) {
                                const bindingPath = binding.path;
                                let fnDef: t.FunctionExpression | t.ArrowFunctionExpression | undefined;
                                let fnDefPath: NodePath<typeof fnDef> | undefined;

                                if (bindingPath.parentKey === 'params' && t.isFunctionExpression(bindingPath.parent)) {
                                    const argPos = _.findIndex(
                                        bindingPath.parent.params,
                                        param => param === bindingPath.node,
                                    );
                                    const firstCallExpParentPath = bindingPath.findParent(p => t.isCallExpression(p));
                                    if (firstCallExpParentPath && t.isCallExpression(firstCallExpParentPath.node)) {
                                        const fn = firstCallExpParentPath.node.arguments[argPos];
                                        if (isFunction(fn)) {
                                            fnDef = fn;
                                            fnDefPath = firstCallExpParentPath.get(
                                                `arguments.${argPos}`,
                                            ) as typeof fnDefPath;
                                        }
                                    }
                                } else if (
                                    t.isVariableDeclarator(bindingPath.node) &&
                                    isFunction(bindingPath.node.init)
                                ) {
                                    fnDef = bindingPath.node.init;
                                    fnDefPath = bindingPath.get(`init`) as typeof fnDefPath;
                                } else {
                                    traverse(
                                        binding.path.scope.block,
                                        {
                                            AssignmentExpression(aePath: NodePath<t.AssignmentExpression>) {
                                                const aeNode = aePath.node;

                                                if (
                                                    t.isIdentifier(aeNode.left) &&
                                                    functionDefinitionVar &&
                                                    aeNode.left.name === functionDefinitionVar.name &&
                                                    isFunction(aeNode.right)
                                                ) {
                                                    fnDef = aeNode.right;
                                                    fnDefPath = aePath.get('right') as typeof fnDefPath;
                                                    aePath.stop();
                                                }
                                            },
                                        },
                                        binding.path.scope,
                                    );
                                }

                                if (fnDef && isFunction(fnDef) && fnDefPath) {
                                    functionDefinition = transformArrowFunctionToFunction(fnDef);
                                    functionDefinitionPath = fnDefPath as typeof functionDefinitionPath;
                                }
                            }
                        } else {
                            path.stop();
                            return;
                        }
                    }

                    if (!functionDefinition || !functionDefinitionPath) {
                        path.stop();
                        return;
                    }

                    let firstInjectedIdentifier: t.Identifier | undefined;

                    if (functionDefinition.params.length > dependencyList.length) {
                        firstInjectedIdentifier = functionDefinition.params[dependencyList.length] as t.Identifier;
                    }

                    let newFunctionDefinition: t.CallExpression | t.FunctionExpression = t.functionExpression(
                        undefined,
                        functionDefinition.params,
                        t.blockStatement(
                            _.map<any, any>(
                                _.slice(functionDefinition.params, dependencyList.length),
                                (id: t.Identifier, paramIndex: number) => {
                                    return createInjectedNejParamAssignment(id.name, paramIndex);
                                },
                            )
                                .concat(functionDefinition.body.body)
                                .concat(firstInjectedIdentifier ? t.returnStatement(firstInjectedIdentifier) : []),
                        ),
                    );

                    if (pluginOptions && pluginOptions.bindWindowToThis) {
                        newFunctionDefinition = t.callExpression(
                            t.memberExpression(newFunctionDefinition, t.identifier('bind')),
                            [t.identifier('window')],
                        );
                    }

                    if (functionDefinitionVar) {
                        functionDefinitionPath.replaceWith(newFunctionDefinition);
                    }

                    path.replaceWith(
                        t.callExpression(t.identifier(CONSTANTS.DEFINE_NAME), [
                            moduleId || t.stringLiteral(''),
                            t.arrayExpression(dependencyList),
                            functionDefinitionVar ? functionDefinitionVar : newFunctionDefinition,
                        ]),
                    );

                    path.stop();
                }
            },
        },
    };
}
