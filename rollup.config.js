import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
    input: 'ooo.js',
    output: {
        name: 'ooo',
        file: 'bundle.js',
        format: 'iife'
    },
    plugins: [
        resolve(),
        commonjs()
    ]
};