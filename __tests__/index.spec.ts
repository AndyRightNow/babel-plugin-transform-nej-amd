/* tslint:disable */
import { default as transformNejToCommonjsPlugin } from './../src/index';
import * as babel from 'babel-core';

describe('babel-plugin-transform-nej-amd plugin tests', () => {
    describe('Exec tests', () => {
        it('should transform correctly and remove plugins', () => {
            let source = `
NEJ.define([
    './something.js',
    'text!./somethingelse.html',
    'regular!pro/with/alias',
    'other!{pro}/with/other/alias.js'
],  (
    something,
    somethingElse,
    withAlias,
    withOtherAlias,
    o1,
    o2,
    f,
    a
) => {
    var exported = {
        something: something,
        somethingElse: somethingElse,
        withAlias: withAlias,
        withOtherAlias: withOtherAlias
    };

    return exported;
});`;

            let {
                code
            } = babel.transform(
                    source, {
                        plugins: [
                            [transformNejToCommonjsPlugin, {
                                removeNejPlugins: true
                            }],
                        ],
                    },
                );

            expect(code).toEqual(
                `
define('', ['./something.js', './somethingelse.html', 'pro/with/alias', '{pro}/with/other/alias.js'], function (something, somethingElse, withAlias, withOtherAlias, o1, o2, f, a) {
    o1 = {};
    o2 = {};

    f = function () {};

    a = [];

    var exported = {
        something: something,
        somethingElse: somethingElse,
        withAlias: withAlias,
        withOtherAlias: withOtherAlias
    };

    return exported;
    return o1;
});`,
            );
        });

        it('should transform correctly and preserve plugins', () => {
            let source = `
NEJ.define([
    './something.js',
    'text!./somethingelse.html',
    'regular!pro/with/alias',
    'other!{pro}/with/other/alias.js'
],  (
    something,
    somethingElse,
    withAlias,
    withOtherAlias,
    o1,
    o2,
    f,
    a
) => {
    var exported = {
        something: something,
        somethingElse: somethingElse,
        withAlias: withAlias,
        withOtherAlias: withOtherAlias
    };

    return exported;
});`;

            let {
                code
            } = babel.transform(
                    source, {
                        plugins: [
                            [transformNejToCommonjsPlugin],
                        ],
                    },
                );

            expect(code).toEqual(
                `
define('', ['./something.js', 'text!./somethingelse.html', 'regular!pro/with/alias', 'other!{pro}/with/other/alias.js'], function (something, somethingElse, withAlias, withOtherAlias, o1, o2, f, a) {
    o1 = {};
    o2 = {};

    f = function () {};

    a = [];

    var exported = {
        something: something,
        somethingElse: somethingElse,
        withAlias: withAlias,
        withOtherAlias: withOtherAlias
    };

    return exported;
    return o1;
});`,
            );
        });

        it('should transform correctly and replace aliases', () => {
            let source = `
NEJ.define([
    './something.js',
    'text!./somethingelse.html',
    'regular!pro/with/alias',
    'other!{pro}/with/other/alias.js'
],  (
    something,
    somethingElse,
    withAlias,
    withOtherAlias,
    o1,
    o2,
    f,
    a
) => {
    var exported = {
        something: something,
        somethingElse: somethingElse,
        withAlias: withAlias,
        withOtherAlias: withOtherAlias
    };

    return exported;
});`;

            let {
                code
            } = babel.transform(
                    source, {
                        plugins: [
                            [transformNejToCommonjsPlugin, {
                                nejPathAliases: {
                                    pro: 'src/javascript'
                                },
                                removeNejPlugins: true
                            }],
                        ],
                    },
                );

            expect(code).toEqual(
                `
define('', ['./something.js', './somethingelse.html', 'src/javascript/with/alias', 'src/javascript/with/other/alias.js'], function (something, somethingElse, withAlias, withOtherAlias, o1, o2, f, a) {
    o1 = {};
    o2 = {};

    f = function () {};

    a = [];

    var exported = {
        something: something,
        somethingElse: somethingElse,
        withAlias: withAlias,
        withOtherAlias: withOtherAlias
    };

    return exported;
    return o1;
});`,
            );
        });

        it('should transform correctly and remove plugins', () => {
            let source = `
var f;

f = (
    something,
    somethingElse,
    withAlias,
    withOtherAlias,
    o1,
    o2,
    f,
    a
) => {
    var exported = {
        something: something,
        somethingElse: somethingElse,
        withAlias: withAlias,
        withOtherAlias: withOtherAlias
    };

    return exported;
};

define([
    './something.js',
    'text!./somethingelse.html',
    'regular!pro/with/alias',
    'other!{pro}/with/other/alias.js'
],  f);`;

            let {
                code
            } = babel.transform(
                    source, {
                        plugins: [
                            [transformNejToCommonjsPlugin, {
                                removeNejPlugins: true
                            }],
                        ],
                    },
                );

            expect(code).toEqual(
                `
var f;

f = function (something, somethingElse, withAlias, withOtherAlias, o1, o2, f, a) {
    o1 = {};
    o2 = {};

    f = function () {};

    a = [];

    var exported = {
        something: something,
        somethingElse: somethingElse,
        withAlias: withAlias,
        withOtherAlias: withOtherAlias
    };

    return exported;
    return o1;
};

define('', ['./something.js', './somethingelse.html', 'pro/with/alias', '{pro}/with/other/alias.js'], f);`,
            );
        });

        it('should transform correctly and bind the window to the factory function', () => {
            let source = `
var f;

f = (
    something,
    somethingElse,
    withAlias,
    withOtherAlias,
    o1,
    o2,
    f,
    a
) => {
    var exported = {
        something: something,
        somethingElse: somethingElse,
        withAlias: withAlias,
        withOtherAlias: withOtherAlias
    };

    return exported;
};

define([
    './something.js',
    'text!./somethingelse.html',
    'regular!pro/with/alias',
    'other!{pro}/with/other/alias.js'
],  f);`;

            let {
                code
            } = babel.transform(
                    source, {
                        plugins: [
                            [transformNejToCommonjsPlugin, {
                                removeNejPlugins: true,
                                bindWindowToThis: true
                            }],
                        ],
                    },
                );

            expect(code).toEqual(
                `
var f;

f = function (something, somethingElse, withAlias, withOtherAlias, o1, o2, f, a) {
    o1 = {};
    o2 = {};

    f = function () {};

    a = [];

    var exported = {
        something: something,
        somethingElse: somethingElse,
        withAlias: withAlias,
        withOtherAlias: withOtherAlias
    };

    return exported;
    return o1;
}.bind(window);

define('', ['./something.js', './somethingelse.html', 'pro/with/alias', '{pro}/with/other/alias.js'], f);`,
            );
        });
    });
});