import { DataItem, IRuntime, Node } from '@kyve/core';
import { fetchBlock, fetchHeight, isBlockNotFound } from './utils';
import { name, version } from '../package.json';

export default class Near implements IRuntime {
  public name = name;
  public version = version;

  public async getDataItem(core: Node, key: string): Promise<DataItem> {
    let block;

    const headers = await this.generateCoinbaseCloudHeaders(core);

    const height = await fetchHeight(core.poolConfig.rpc, headers);
    if (+key > height) throw new Error();

    try {
      block = await fetchBlock(core.poolConfig.rpc, +key, headers);
    } catch (err) {
      if (isBlockNotFound(err)) return { key, value: null };

      throw err;
    }

    return { key, value: block };
  }

  public async getNextKey(key: string): Promise<string> {
    return (parseInt(key) + 1).toString();
  }

  public async formatValue(value: any): Promise<string> {
    return value.header.hash;
  }

  private async generateCoinbaseCloudHeaders(core: Node): Promise<any> {
    // requestSignature for coinbase cloud
    const address = core.client.account.address;
    const timestamp = new Date().valueOf().toString();
    const poolId = core.pool.id;

    const { signature, pub_key } = await core.client.signString(
      `${address}//${poolId}//${timestamp}`
    );

    return {
      'Content-Type': 'application/json',
      Signature: signature,
      'Public-Key': pub_key.value,
      'Pool-ID': poolId,
      Timestamp: timestamp,
    };
  }
}
