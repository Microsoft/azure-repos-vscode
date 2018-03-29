# Visual Studio Team Services Extension Contributor Guide
The instructions below will help you set up your development environment to contribute to this repository.
Make sure you've already cloned the repo.  :smile:

## Ways to Contribute
Interested in contributing to the vsts-vscode project? There are plenty of ways to contribute, all of which help make the project better.
* Submit a [bug report](https://github.com/Microsoft/vsts-vscode/issues/new) or [feature request](https://github.com/Microsoft/vsts-vscode/issues/new) through the Issue Tracker
* Review the [source code changes](https://github.com/Microsoft/vsts-vscode/pulls)
* Submit a code fix for a bug (see `Submitting Pull Requests` below)
* Participate in [discussions](https://github.com/Microsoft/vsts-vscode/issues)

## Set up Node, npm and gulp

### Node and npm
**Windows and Mac OSX**: Download and install node from [nodejs.org](http://nodejs.org/)

**Linux**: Install [using package manager](https://nodejs.org/en/download/package-manager/)

From a terminal ensure at least node 5.4.1 and npm 3:
```bash
$ node -v && npm -v
v5.9.0
3.8.2
```
**Note**: To get npm version 3.8.2, you may need to update npm after installing node.  To do that:
```bash
[sudo] npm install npm -g
```

### Gulp
Install gulp
```bash
[sudo] npm install gulp -g
```
From the root of the repo, install all of the build dependencies:
```bash
[sudo] npm install --greedy
```

### Install the Visual Studio Code Extension Manager (VSCE)
Before packaging via gulp, ensure that you have the "vsce" tool installed globally.  Otherwise, the package step will fail.

From the root of the repo, run:
```bash
[sudo] npm install vsce -g
```

## Build
To build the extension, run the following from the root of the repo:

```bash
gulp
```
This command will create the out\src and out\test folders at the root of the repository. 

## Tests
Tests should be run with changes.  Before you run tests, make sure you have built the extension.  Run the following from the root of the repo:

```bash
gulp test
```
To run the tests within Visual Studio Code, change the debug profile to "Launch Tests" and press `F5`.

## Package
The package command will package the extension into a Visual Studio extension installer (.vsix file).
It will also transpile the TypeScript into the out\src and out\test folders.

From the root of the repo:
```bash
gulp package
```
The VSIX package will be created in the root of the repository.

## Code Structure
The code is structured between the Visual Studio Code extension file, the Team Services extension object, and the clients, contexts, helpers and services.

### Visual Studio Code Extension file
This is the file with the code called by Visual Studio Code to bootstrap the extension.  **extension.ts** should be thin and delegate to the Team Services Extension object.

### Team Services Extension object
This is the object intended to have small methods that call to the feature-specific clients that manipulate the UI and make calls to Team Services via the service objects.  When adding new commands, the functions that are called should be defined here.

### Clients
These are the clients used to talk to the services (see Services below).  The clients can manipulate the UI but should be the only objects calling the feature-specific services.

### Contexts
* Git - This context is meant to contain the client-side Git configuration information
* Server - This context is meant to contain the server-side information needed when making calls to Team Services

### Helpers
These are classes used to define constants, a logger, settings (configuration), strings and various utility functions.

### Info
These are classes used to hold data about particular objects (credentials, repository and user).

### Services
All of the communication to Team Services should be done via services found in this folder.  These services should not know anything about the client-side types used to manipulate the Visual Studio Code UI.  The Q Promise APIs found in the vso-node-api package is the model used in this extension.

## Debugging
To debug the extension, make sure you've installed all of the npm packages as instructed earlier.  Then, open the root of the repository in Visual Studio Code and press F5.  If you have the extension already installed, you'll need to uninstall it via the Command Palette and try again.

During debugging, you may want to control how often polling occurs for build status and pull request updates.  Or you may want to turn on debug console and `winston` logging.  The [README.md](README.md) file has instructions on how to change those settings.

## Code Styles
1. The various gulp commands will run `tslint` and flag any errors.  Please ensure that the code stays clean.
2. All source files must have the following lines at the top:
```
 /*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
```
3. We keep LF line-endings on the server. Please set the `core.safecrlf` git config property to true.
```
git config core.safecrlf true
```

## Contribution License Agreement
In order to contribute, you will need to sign a [Contributor License Agreement](https://cla.microsoft.com/).

## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Submitting Pull Requests
We welcome pull requests!  Fork this repo and send us your contributions.  Go [here](https://help.github.com/articles/using-pull-requests/) to get familiar with GitHub pull requests.

Before submitting your request, ensure that both `gulp` and `gulp test` succeed.

**UPDATE**: With a recent commit, integration tests were added under the *test-integration* folder.  These tests are run by the CI build and the results are reported back to any pull request as a "build check".  The
integration tests are not runnable outside of the CI build without setting up additional infrastructure.  As such, it isn't required that a contributor run these tests before submitting the pull request.
However, if an issue arises that breaks the integration tests, please file an issue and I'll follow up as quickly as possible.  Note that the build for this repo is set to build every night and runs unit
and integration tests at that time.
