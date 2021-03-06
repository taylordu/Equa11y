#!/usr/bin/env node

import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import CLI from 'clui';
import { prompts } from './prompts';
import { puppet } from './puppeteer';
import { dataParser, ParsedData } from './dataParser';
import { manualCheckObj } from './manualCheckObj';
import open from 'open';

interface Program {
  start(): Promise<void>;
  loop(parsed: ParsedData, path: string, targetLevel?: string): Promise<void>;
}

const { Spinner } = CLI;
const spinner = new Spinner('Loading, please wait!');

export const program: Program = {
  start: async () => {
    // Heading creation
    clear();
    console.log(chalk.cyan(figlet.textSync('Equa11y', { horizontalLayout: 'full' })));
    // Ask for URL/localpath
    try {
      const inputURL = { url: 'http://google.com' }; // optional hardcoding for dev
      // const inputURL = await prompts.askPath(); // real prompt for publishing
      spinner.start();
      const data = await puppet(inputURL.url);
      const parsed = dataParser(data);
      spinner.stop();

      // console.log(parsed);
      // console.log(parsed.moderate![2].specificIssues!);
      // Ask user for next step
      await program.loop(parsed, inputURL.url);
    } catch (error) {
      spinner.stop();

      const errors = await prompts.askError(error);
      if (errors.startOver === 'quit') process.exit(0);
      else if (errors.startOver === 'search again') program.start();
    }
  },

  loop: async (parsed, path, targetLevel) => {
    // Reset the display
    clear();
    console.log(chalk.cyan(figlet.textSync('Equa11y', { horizontalLayout: 'full' })));
    console.log(chalk.bold('Input URL:'), path);

    const options = await prompts.askOptions(parsed, targetLevel);
    if (options.res === 'quit') process.exit(0);
    else if (options.res.trim().slice(0, 4) === 'http') {
      open(options.res.trim());
      program.loop(parsed, path);
    } else if (options.res === 'search again') program.start();
    // check if nested
    else if (options.res[0] === ' ') {
      // grabs string between arrow and '(n) issues types: TBD total sub issues'
      const id = options.res.trim().split(' ').slice(1, -7).join(' ');
      program.loop(parsed, path, id);
    }
    // Parse leading arrow
    else {
      const arrow = options.res.trim()[0];
      if (arrow === '⇒') {
        const targetLevel = options.res.trim().split(' ')[1];
        // console.log(targetLevel);
        program.loop(parsed, path, targetLevel);
      } else {
        program.loop(parsed, path);
      }
    }
  },
};

program.start();
