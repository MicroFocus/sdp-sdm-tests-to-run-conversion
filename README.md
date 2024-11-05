## 1. Introduction 🚀

This is a command-line tool desinged to convert a list of test details received from **OpenText Software Delivery Platform** to a format accepted by common frameworks. The tool allows defining custom conversion flow for other frameworks that are not supported by default.

## 2. Table of Contents

- [1. Introduction](#1-introduction)
- [2. Table of Contents](#2-table-of-contents)
- [3. Description](#3-description)
  - [3.1. Supported Frameworks](#31-supported-frameworks)
- [4. Getting Started](#4-getting-started)

## 3. Description

### 3.1. Supported Frameworks

- Cucumber
- Cucumber with BDD Scenario
- JUnit
- Maven Surefire
- TestNG
- Custom (define your custom framework configuration)

## 4. Getting Started

### 4.1. Running the tool

```bash
node dist/index.js --framework="<framework_name>" --testsToRun="<test_definitions>" --logLevel=<level>
```
