// import { createJsWithTsEsmPreset } from 'ts-jest/presets/index.js';
// import { jsWithTs as tsjPreset } from 'ts-jest/presets/index.js';

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
    transformIgnorePatterns: ['/node_modules/(?!change-case/)'],
    // transformIgnorePatterns: ['/node_modules/change-case/'],
};
