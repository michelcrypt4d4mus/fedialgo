module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
    transformIgnorePatterns: ['/node_modules/(?!change-case/)'],
    // transformIgnorePatterns: ['/node_modules/change-case/'],
};
