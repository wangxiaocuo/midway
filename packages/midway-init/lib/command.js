'use strict';

const path = require('path');
const { LightGenerator } = require('light-generator');
const { Input, Select, Form } = require('enquirer');
const chalk = require('chalk');
const { getParser } = require('./parser');
const { EventEmitter } = require('events');

async function sleep(timeout) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

const defaultOptions = {
  templateListPath: path.join(__dirname, '../boilerplate.json'),
};

class MidwayInitCommand extends EventEmitter {

  constructor(npmClient) {
    super();
    this.npmClient = npmClient || 'npm';
    this._innerPrompt = null;
    this.showPrompt = true;
  }

  set prompt(value) {
    const originRun = value.run;
    value.run = async () => {
      await this.beforePromptSubmit();
      return await originRun.call(value);
    };
    this._innerPrompt = value;
  }

  get prompt() {
    return this._innerPrompt;
  }

  async beforePromptSubmit() {
  }

  async run(cwd, args) {
    const argv = this.argv = getParser().parse(args || []);
    this.cwd = cwd;

    this.templateList = await this.getTemplateList();

    if (argv.dir) {
      // support --dir argument
      this.targetPath = argv.dir;
    }

    if (argv.type) {
      // support --type argument
      this.templateName = argv.type;
      await this.createFromTemplate();
    } else if (argv.template) {
      // support --template argument
      // ready targetDir
      await this.createTargetDir();
      const lightGenerator = new LightGenerator();
      const generator = lightGenerator.defineLocalPath({
        templatePath: this.getAbsoluteDir(argv.template),
        targetPath: this.targetPath,
      });
      await this.execBoilerplate(generator);
    } else if (argv.package) {
      // support --package argument
      await this.createFromTemplate(argv.package);
    } else {
      this.prompt = new Select({
        name: 'templateName',
        message: 'Hello, traveller.\n  Which template do you like?',
        choices: Object.keys(this.templateList).map(template => {
          return `${template} - ${this.templateList[template].description}` +
            (this.templateList[template].author ? `(by @${chalk.underline.bold(this.templateList[template].author)})` : '');
        }),
        result: value => {
          return value.split(' - ')[0];
        },
        show: this.showPrompt,
      });
      // get user input template
      this.templateName = await this.prompt.run();
      await this.createFromTemplate();
    }
    // done
    this.printUsage();
  }

  async createFromTemplate(packageName) {
    // ready targetDir
    await this.createTargetDir();
    const lightGenerator = new LightGenerator();
    const generator = lightGenerator.defineNpmPackage({
      npmClient: this.npmClient,
      npmPackage: packageName || this.templateList[this.templateName].package,
      targetPath: this.targetPath,
    });
    await this.execBoilerplate(generator);
  }

  async getTemplateList() {
    if (!this.templateName) {
      return require(defaultOptions.templateListPath);
    }
  }

  async readyGenerate() {
    console.log();
    await sleep(1000);
    console.log('1...');
    await sleep(1000);
    console.log('2...');
    await sleep(1000);
    console.log('3...');
    await sleep(1000);
    console.log('Enjoy it...');
  }

  async createTargetDir() {
    if (!this.targetPath) {
      this.prompt = new Input({
        message: 'The directory where the boilerplate should be created',
        initial: 'my_midway_app',
        show: this.showPrompt,
      });
      // get target path where template will be copy to
      this.targetPath = await this.prompt.run();
    }
    this.targetPath = this.getAbsoluteDir(this.targetPath);
  }

  async execBoilerplate(generator) {
    const args = await generator.getParameterList();
    const argsKeys = Object.keys(args);
    if (argsKeys && argsKeys.length) {
      this.prompt = new Form({
        name: 'user',
        message: 'Please provide the following information:',
        choices: argsKeys.map(argsKey => {
          return {
            name: `${argsKey}`,
            message: `${args[argsKey].desc}`,
            initial: `${args[argsKey].default}`,
          };
        }),
        show: this.showPrompt,
      });

      const parameters = await this.prompt.run();
      await this.readyGenerate();
      await generator.run(parameters);
    } else {
      await this.readyGenerate();
      await generator.run();
    }
  }

  getAbsoluteDir(dir) {
    if (!path.isAbsolute(dir)) {
      dir = path.join(process.cwd(), dir);
    }
    return dir;
  }

  printUsage() {
    // this.serverless.cli.asciiGreeting();
    // this.serverless.cli
    //   .log(`Successfully generated boilerplate for template: "${this.options.template}"`);
    console.log();
  }
}

module.exports = MidwayInitCommand;
