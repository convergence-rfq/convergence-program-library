#!/usr/bin/env ts-node

import * as anchor from '@project-serum/anchor';
import * as dotenv from 'dotenv';

import { getLiveRFQs } from '../lib/helpers';

dotenv.config();

anchor.setProvider(anchor.Provider.env());

const provider = anchor.getProvider();

const main = async (): Promise<any> => {
  const titles = await getLiveRFQs(provider);
  return titles;
}

main()
  .then(rfqTitles => {
    console.log(rfqTitles);
  })
  .catch(err => {
    console.log(err);
  });