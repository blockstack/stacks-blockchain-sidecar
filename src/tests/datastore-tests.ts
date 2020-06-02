import { MemoryDataStore } from '../datastore/memory-store';
import {
  DbBlock,
  DbTx,
  DbTxTypeId,
  DbStxEvent,
  DbAssetEventTypeId,
  DbEventTypeId,
  DbFtEvent,
  DbNftEvent,
  DbSmartContractEvent,
  DbSmartContract,
} from '../datastore/common';
import { PgDataStore, cycleMigrations, runMigrations } from '../datastore/postgres-store';
import { PoolClient } from 'pg';

// This can be removed once typing bug is sorted https://github.com/DefinitelyTyped/DefinitelyTyped/pull/42786
function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    expect(condition).toBe(true);
    throw new Error(msg ?? 'Assertion failed');
  }
}

describe('in-memory datastore', () => {
  let db: MemoryDataStore;

  beforeEach(() => {
    db = new MemoryDataStore();
  });

  test('in-memory block store and retrieve', async () => {
    const block: DbBlock = {
      block_hash: '123',
      index_block_hash: '0x1234',
      parent_block_hash: '0x5678',
      parent_microblock: '987',
      block_height: 123,
      burn_block_time: 39486,
      canonical: false,
    };
    await db.updateBlock(block);
    const blockQuery = await db.getBlock(block.block_hash);
    assert(blockQuery.found);
    expect(blockQuery.result).toEqual(block);
  });
});

describe('postgres datastore', () => {
  let db: PgDataStore;
  let client: PoolClient;

  beforeEach(async () => {
    process.env.PG_DATABASE = 'postgres';
    await cycleMigrations();
    db = await PgDataStore.connect();
    client = await db.pool.connect();
  });

  test('pg STX balances', async () => {
    const tx: DbTx = {
      tx_id: '0x1234',
      tx_index: 4,
      index_block_hash: '0x5432',
      block_hash: '0x9876',
      block_height: 68456,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.Coinbase,
      coinbase_payload: Buffer.from('coinbase hi'),
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([0x01, 0xf5]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
    };
    const createStxEvent = (
      sender: string,
      recipient: string,
      amount: number,
      canonical: boolean = true
    ): DbStxEvent => {
      const stxEvent: DbStxEvent = {
        canonical,
        event_type: DbEventTypeId.StxAsset,
        asset_event_type_id: DbAssetEventTypeId.Transfer,
        event_index: 0,
        tx_id: tx.tx_id,
        block_height: tx.block_height,
        amount: BigInt(amount),
        recipient,
        sender,
      };
      return stxEvent;
    };
    const events = [
      createStxEvent('none', 'addrA', 100_000),
      createStxEvent('addrA', 'addrB', 100),
      createStxEvent('addrA', 'addrB', 250),
      createStxEvent('addrA', 'addrB', 40, false),
      createStxEvent('addrB', 'addrC', 15),
      createStxEvent('addrA', 'addrC', 35),
    ];
    for (const event of events) {
      await db.updateStxEvent(client, tx, event);
    }

    const addrAResult = await db.getStxBalance('addrA');
    const addrBResult = await db.getStxBalance('addrB');
    const addrCResult = await db.getStxBalance('addrC');
    const addrDResult = await db.getStxBalance('addrD');

    expect(addrAResult).toEqual({
      balance: BigInt(99615),
      totalReceived: BigInt(100000),
      totalSent: BigInt(385),
    });
    expect(addrBResult).toEqual({
      balance: BigInt(335),
      totalReceived: BigInt(350),
      totalSent: BigInt(15),
    });
    expect(addrCResult).toEqual({
      balance: BigInt(50),
      totalReceived: BigInt(50),
      totalSent: BigInt(0),
    });
    expect(addrDResult).toEqual({
      balance: BigInt(0),
      totalReceived: BigInt(0),
      totalSent: BigInt(0),
    });
  });

  test('pg FT balances', async () => {
    const tx: DbTx = {
      tx_id: '0x1234',
      tx_index: 4,
      index_block_hash: '0x5432',
      block_hash: '0x9876',
      block_height: 68456,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.Coinbase,
      coinbase_payload: Buffer.from('coinbase hi'),
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([0x01, 0xf5]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
    };
    const createFtEvent = (
      sender: string,
      recipient: string,
      assetId: string,
      amount: number,
      canonical: boolean = true
    ): DbFtEvent => {
      const ftEvent: DbFtEvent = {
        canonical,
        event_type: DbEventTypeId.FungibleTokenAsset,
        asset_event_type_id: DbAssetEventTypeId.Transfer,
        event_index: 0,
        tx_id: tx.tx_id,
        block_height: tx.block_height,
        asset_identifier: assetId,
        amount: BigInt(amount),
        recipient,
        sender,
      };
      return ftEvent;
    };
    const events = [
      createFtEvent('none', 'addrA', 'bux', 100_000),
      createFtEvent('addrA', 'addrB', 'bux', 100),
      createFtEvent('addrA', 'addrB', 'bux', 250),
      createFtEvent('addrA', 'addrB', 'bux', 40, false),
      createFtEvent('addrB', 'addrC', 'bux', 15),
      createFtEvent('addrA', 'addrC', 'bux', 35),
      createFtEvent('none', 'addrA', 'gox', 200_000),
      createFtEvent('addrA', 'addrB', 'gox', 200),
      createFtEvent('addrA', 'addrB', 'gox', 350),
      createFtEvent('addrA', 'addrB', 'gox', 60, false),
      createFtEvent('addrB', 'addrC', 'gox', 25),
      createFtEvent('addrA', 'addrC', 'gox', 75),
      createFtEvent('none', 'addrA', 'cash', 500_000),
      createFtEvent('addrA', 'none', 'tendies', 1_000_000),
    ];
    for (const event of events) {
      await db.updateFtEvent(client, tx, event);
    }

    const addrAResult = await db.getFungibleTokenBalances('addrA');
    const addrBResult = await db.getFungibleTokenBalances('addrB');
    const addrCResult = await db.getFungibleTokenBalances('addrC');
    const addrDResult = await db.getFungibleTokenBalances('addrD');

    expect([...addrAResult]).toEqual([
      ['bux', { balance: BigInt(99615), totalReceived: BigInt(100000), totalSent: BigInt(385) }],
      ['cash', { balance: BigInt(500000), totalReceived: BigInt(500000), totalSent: BigInt(0) }],
      ['gox', { balance: BigInt(199375), totalReceived: BigInt(200000), totalSent: BigInt(625) }],
      [
        'tendies',
        { balance: BigInt(-1000000), totalReceived: BigInt(0), totalSent: BigInt(1000000) },
      ],
    ]);
    expect([...addrBResult]).toEqual([
      ['bux', { balance: BigInt(335), totalReceived: BigInt(350), totalSent: BigInt(15) }],
      ['gox', { balance: BigInt(525), totalReceived: BigInt(550), totalSent: BigInt(25) }],
    ]);
    expect([...addrCResult]).toEqual([
      ['bux', { balance: BigInt(50), totalReceived: BigInt(50), totalSent: BigInt(0) }],
      ['gox', { balance: BigInt(100), totalReceived: BigInt(100), totalSent: BigInt(0) }],
    ]);
    expect([...addrDResult]).toEqual([]);
  });

  test('pg NFT counts', async () => {
    const tx: DbTx = {
      tx_id: '0x1234',
      tx_index: 4,
      index_block_hash: '0x5432',
      block_hash: '0x9876',
      block_height: 68456,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.Coinbase,
      coinbase_payload: Buffer.from('coinbase hi'),
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([0x01, 0xf5]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
    };
    const createNFtEvents = (
      sender: string,
      recipient: string,
      assetId: string,
      count: number,
      canonical: boolean = true
    ): DbNftEvent[] => {
      const events: DbNftEvent[] = [];
      for (let i = 0; i < count; i++) {
        const nftEvent: DbNftEvent = {
          canonical,
          event_type: DbEventTypeId.NonFungibleTokenAsset,
          asset_event_type_id: DbAssetEventTypeId.Transfer,
          event_index: 0,
          tx_id: tx.tx_id,
          block_height: tx.block_height,
          asset_identifier: assetId,
          value: Buffer.from([0]),
          recipient,
          sender,
        };
        events.push(nftEvent);
      }
      return events;
    };
    const events = [
      createNFtEvents('none', 'addrA', 'bux', 300),
      createNFtEvents('addrA', 'addrB', 'bux', 10),
      createNFtEvents('addrA', 'addrB', 'bux', 25),
      createNFtEvents('addrA', 'addrB', 'bux', 4, false),
      createNFtEvents('addrB', 'addrC', 'bux', 1),
      createNFtEvents('addrA', 'addrC', 'bux', 3),
      createNFtEvents('none', 'addrA', 'gox', 200),
      createNFtEvents('addrA', 'addrB', 'gox', 20),
      createNFtEvents('addrA', 'addrB', 'gox', 35),
      createNFtEvents('addrA', 'addrB', 'gox', 6, false),
      createNFtEvents('addrB', 'addrC', 'gox', 2),
      createNFtEvents('addrA', 'addrC', 'gox', 7),
      createNFtEvents('none', 'addrA', 'cash', 500),
      createNFtEvents('addrA', 'none', 'tendies', 100),
    ];
    for (const event of events.flat()) {
      await db.updateNftEvent(client, tx, event);
    }

    const addrAResult = await db.getNonFungibleTokenCounts('addrA');
    const addrBResult = await db.getNonFungibleTokenCounts('addrB');
    const addrCResult = await db.getNonFungibleTokenCounts('addrC');
    const addrDResult = await db.getNonFungibleTokenCounts('addrD');

    expect([...addrAResult]).toEqual([
      ['bux', { count: BigInt(262), totalReceived: BigInt(300), totalSent: BigInt(38) }],
      ['cash', { count: BigInt(500), totalReceived: BigInt(500), totalSent: BigInt(0) }],
      ['gox', { count: BigInt(138), totalReceived: BigInt(200), totalSent: BigInt(62) }],
      ['tendies', { count: BigInt(-100), totalReceived: BigInt(0), totalSent: BigInt(100) }],
    ]);
    expect([...addrBResult]).toEqual([
      ['bux', { count: BigInt(34), totalReceived: BigInt(35), totalSent: BigInt(1) }],
      ['gox', { count: BigInt(53), totalReceived: BigInt(55), totalSent: BigInt(2) }],
    ]);
    expect([...addrCResult]).toEqual([
      ['bux', { count: BigInt(4), totalReceived: BigInt(4), totalSent: BigInt(0) }],
      ['gox', { count: BigInt(9), totalReceived: BigInt(9), totalSent: BigInt(0) }],
    ]);
    expect([...addrDResult]).toEqual([]);
  });

  test('pg block store and retrieve', async () => {
    const block: DbBlock = {
      block_hash: '0x1234',
      index_block_hash: '0xdeadbeef',
      parent_block_hash: '0xff0011',
      parent_microblock: '0x9876',
      block_height: 1235,
      burn_block_time: 94869286,
      canonical: true,
    };
    await db.updateBlock(client, block);
    const blockQuery = await db.getBlock(block.block_hash);
    assert(blockQuery.found);
    expect(blockQuery.result).toEqual(block);

    const tx: DbTx = {
      tx_id: '0x1234',
      tx_index: 4,
      index_block_hash: block.index_block_hash,
      block_hash: block.block_hash,
      block_height: 68456,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.Coinbase,
      coinbase_payload: Buffer.from('coinbase hi'),
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([0x01, 0xf5]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
    };
    await db.updateTx(client, tx);
    const blockTxs = await db.getBlockTxs(block.index_block_hash);
    expect(blockTxs.results).toHaveLength(1);
    expect(blockTxs.results[0]).toBe('0x1234');
  });

  test('pg tx store and retrieve with post-conditions', async () => {
    const tx: DbTx = {
      tx_id: '0x1234',
      tx_index: 4,
      index_block_hash: '0x3434',
      block_hash: '0x5678',
      block_height: 68456,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.Coinbase,
      coinbase_payload: Buffer.from('coinbase hi'),
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([0x01, 0xf5]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
    };
    await db.updateTx(client, tx);
    const txQuery = await db.getTx(tx.tx_id);
    assert(txQuery.found);
    expect(txQuery.result).toEqual(tx);
  });

  test('pg `token-transfer` tx type constraint', async () => {
    const tx: DbTx = {
      tx_id: '0x421234',
      tx_index: 4,
      index_block_hash: '0x3434',
      block_hash: '0x5678',
      block_height: 68456,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.TokenTransfer,
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
    };
    await expect(db.updateTx(client, tx)).rejects.toEqual(
      new Error('new row for relation "txs" violates check constraint "valid_token_transfer"')
    );
    tx.token_transfer_amount = BigInt(34);
    tx.token_transfer_memo = Buffer.from('thx');
    tx.token_transfer_recipient_address = 'recipient-addr';
    await db.updateTx(client, tx);
    const txQuery = await db.getTx(tx.tx_id);
    assert(txQuery.found);
    expect(txQuery.result).toEqual(tx);
  });

  test('pg `smart-contract` tx type constraint', async () => {
    const tx: DbTx = {
      tx_id: '0x421234',
      tx_index: 4,
      index_block_hash: '0x3434',
      block_hash: '0x5678',
      block_height: 68456,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.SmartContract,
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
    };
    await expect(db.updateTx(client, tx)).rejects.toEqual(
      new Error('new row for relation "txs" violates check constraint "valid_smart_contract"')
    );
    tx.smart_contract_contract_id = 'my-contract';
    tx.smart_contract_source_code = '(src)';
    await db.updateTx(client, tx);
    const txQuery = await db.getTx(tx.tx_id);
    assert(txQuery.found);
    expect(txQuery.result).toEqual(tx);
  });

  test('pg `contract-call` tx type constraint', async () => {
    const tx: DbTx = {
      tx_id: '0x421234',
      tx_index: 4,
      index_block_hash: '0x3434',
      block_hash: '0x5678',
      block_height: 68456,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.ContractCall,
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
    };
    await expect(db.updateTx(client, tx)).rejects.toEqual(
      new Error('new row for relation "txs" violates check constraint "valid_contract_call"')
    );
    tx.contract_call_contract_id = 'my-contract';
    tx.contract_call_function_name = 'my-fn';
    tx.contract_call_function_args = Buffer.from('test');
    await db.updateTx(client, tx);
    const txQuery = await db.getTx(tx.tx_id);
    assert(txQuery.found);
    expect(txQuery.result).toEqual(tx);
  });

  test('pg `poison-microblock` tx type constraint', async () => {
    const tx: DbTx = {
      tx_id: '0x421234',
      tx_index: 4,
      index_block_hash: '0x3434',
      block_hash: '0x5678',
      block_height: 68456,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.PoisonMicroblock,
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
    };
    await expect(db.updateTx(client, tx)).rejects.toEqual(
      new Error('new row for relation "txs" violates check constraint "valid_poison_microblock"')
    );
    tx.poison_microblock_header_1 = Buffer.from('poison A');
    tx.poison_microblock_header_2 = Buffer.from('poison B');
    await db.updateTx(client, tx);
    const txQuery = await db.getTx(tx.tx_id);
    assert(txQuery.found);
    expect(txQuery.result).toEqual(tx);
  });

  test('pg `coinbase` tx type constraint', async () => {
    const tx: DbTx = {
      tx_id: '0x421234',
      tx_index: 4,
      index_block_hash: '0x3434',
      block_hash: '0x5678',
      block_height: 68456,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.Coinbase,
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
    };
    await expect(db.updateTx(client, tx)).rejects.toEqual(
      new Error('new row for relation "txs" violates check constraint "valid_coinbase"')
    );
    tx.coinbase_payload = Buffer.from('coinbase hi');
    await db.updateTx(client, tx);
    const txQuery = await db.getTx(tx.tx_id);
    assert(txQuery.found);
    expect(txQuery.result).toEqual(tx);
  });

  test('pg tx store duplicate block index hash data', async () => {
    const tx: DbTx = {
      tx_id: '0x1234',
      tx_index: 4,
      index_block_hash: '0x5555',
      block_hash: '0x5678',
      block_height: 68456,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.Coinbase,
      coinbase_payload: Buffer.from('coinbase hi'),
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([0x01, 0xf5]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
    };
    const updatedRows = await db.updateTx(client, tx);
    expect(updatedRows).toBe(1);
    const txQuery = await db.getTx(tx.tx_id);
    assert(txQuery.found);
    expect(txQuery.result).toEqual(tx);
    const dupeUpdateRows = await db.updateTx(client, tx);
    expect(dupeUpdateRows).toBe(0);
  });

  test('pg event store and retrieve', async () => {
    const block1: DbBlock = {
      block_hash: '0x1234',
      index_block_hash: '0xdeadbeef',
      parent_block_hash: '0xff0011',
      parent_microblock: '0x9876',
      block_height: 333,
      burn_block_time: 94869286,
      canonical: true,
    };
    const tx1: DbTx = {
      tx_id: '0x421234',
      tx_index: 0,
      index_block_hash: '0x1234',
      block_hash: '0x5678',
      block_height: 333,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.Coinbase,
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
      coinbase_payload: Buffer.from('hi'),
    };
    const tx2: DbTx = {
      ...tx1,
      tx_id: '0x012345',
      tx_index: 1,
    };
    const stxEvent1: DbStxEvent = {
      event_index: 1,
      tx_id: '0x421234',
      block_height: 333,
      canonical: true,
      asset_event_type_id: DbAssetEventTypeId.Transfer,
      sender: 'sender-addr',
      recipient: 'recipient-addr',
      event_type: DbEventTypeId.StxAsset,
      amount: BigInt(789),
    };
    const ftEvent1: DbFtEvent = {
      event_index: 2,
      tx_id: '0x421234',
      block_height: 333,
      canonical: true,
      asset_event_type_id: DbAssetEventTypeId.Transfer,
      sender: 'sender-addr',
      recipient: 'recipient-addr',
      event_type: DbEventTypeId.FungibleTokenAsset,
      amount: BigInt(789),
      asset_identifier: 'ft-asset-id',
    };
    const nftEvent1: DbNftEvent = {
      event_index: 3,
      tx_id: '0x421234',
      block_height: 333,
      canonical: true,
      asset_event_type_id: DbAssetEventTypeId.Transfer,
      sender: 'sender-addr',
      recipient: 'recipient-addr',
      event_type: DbEventTypeId.NonFungibleTokenAsset,
      value: Buffer.from('some val'),
      asset_identifier: 'nft-asset-id',
    };
    const contractLogEvent1: DbSmartContractEvent = {
      event_index: 4,
      tx_id: '0x421234',
      block_height: 333,
      canonical: true,
      event_type: DbEventTypeId.SmartContractLog,
      contract_identifier: 'some-contract-id',
      topic: 'some-topic',
      value: Buffer.from('some val'),
    };
    const smartContract1: DbSmartContract = {
      tx_id: '0x421234',
      canonical: true,
      block_height: 333,
      contract_id: 'some-contract-id',
      source_code: '(some-contract-src)',
      abi: '{"some-abi":1}',
    };
    await db.update({
      block: block1,
      txs: [
        {
          tx: tx1,
          stxEvents: [stxEvent1],
          ftEvents: [ftEvent1],
          nftEvents: [nftEvent1],
          contractLogEvents: [contractLogEvent1],
          smartContracts: [smartContract1],
        },
        {
          tx: tx2,
          stxEvents: [],
          ftEvents: [],
          nftEvents: [],
          contractLogEvents: [],
          smartContracts: [],
        },
      ],
    });

    const fetchTx1 = await db.getTx(tx1.tx_id);
    assert(fetchTx1.found);
    expect(fetchTx1.result).toEqual(tx1);

    const fetchTx2 = await db.getTx(tx2.tx_id);
    assert(fetchTx2.found);
    expect(fetchTx2.result).toEqual(tx2);

    const fetchBlock1 = await db.getBlock(block1.block_hash);
    assert(fetchBlock1.found);
    expect(fetchBlock1.result).toEqual(block1);

    const fetchContract1 = await db.getSmartContract(smartContract1.contract_id);
    assert(fetchContract1.found);
    expect(fetchContract1.result).toEqual(smartContract1);

    const fetchTx1Events = await db.getTxEvents(tx1.tx_id, tx1.index_block_hash);
    expect(fetchTx1Events.results).toHaveLength(4);
    expect(fetchTx1Events.results.find(e => e.event_index === 1)).toEqual(stxEvent1);
    expect(fetchTx1Events.results.find(e => e.event_index === 2)).toEqual(ftEvent1);
    expect(fetchTx1Events.results.find(e => e.event_index === 3)).toEqual(nftEvent1);
    expect(fetchTx1Events.results.find(e => e.event_index === 4)).toEqual(contractLogEvent1);
  });

  test('pg reorg handling', async () => {
    const block1: DbBlock = {
      block_hash: '0x1234',
      index_block_hash: '0xdeadbeef',
      parent_block_hash: '0xff0011',
      parent_microblock: '0x9876',
      block_height: 333,
      burn_block_time: 94869286,
      canonical: true,
    };
    const block2: DbBlock = {
      ...block1,
      block_height: 334,
      block_hash: '0x1235',
      index_block_hash: '0xabcd',
    };
    const tx1: DbTx = {
      tx_id: '0x421234',
      tx_index: 4,
      index_block_hash: '0x1234',
      block_hash: '0x5678',
      block_height: 333,
      burn_block_time: 2837565,
      type_id: DbTxTypeId.Coinbase,
      status: 1,
      canonical: true,
      post_conditions: Buffer.from([]),
      fee_rate: BigInt(1234),
      sponsored: false,
      sender_address: 'sender-addr',
      origin_hash_mode: 1,
      coinbase_payload: Buffer.from('hi'),
    };
    const tx2: DbTx = {
      ...tx1,
      tx_id: '0x012345',
      index_block_hash: '0x1235',
      block_height: 334,
    };
    const stxEvent1: DbStxEvent = {
      event_index: 1,
      tx_id: '0x421234',
      block_height: 333,
      canonical: true,
      asset_event_type_id: DbAssetEventTypeId.Transfer,
      sender: 'sender-addr',
      recipient: 'recipient-addr',
      event_type: DbEventTypeId.StxAsset,
      amount: BigInt(789),
    };
    const ftEvent1: DbFtEvent = {
      event_index: 2,
      tx_id: '0x421234',
      block_height: 333,
      canonical: true,
      asset_event_type_id: DbAssetEventTypeId.Transfer,
      sender: 'sender-addr',
      recipient: 'recipient-addr',
      event_type: DbEventTypeId.FungibleTokenAsset,
      amount: BigInt(789),
      asset_identifier: 'ft-asset-id',
    };
    const nftEvent1: DbNftEvent = {
      event_index: 3,
      tx_id: '0x421234',
      block_height: 333,
      canonical: true,
      asset_event_type_id: DbAssetEventTypeId.Transfer,
      sender: 'sender-addr',
      recipient: 'recipient-addr',
      event_type: DbEventTypeId.NonFungibleTokenAsset,
      value: Buffer.from('some val'),
      asset_identifier: 'nft-asset-id',
    };
    const contractLogEvent1: DbSmartContractEvent = {
      event_index: 4,
      tx_id: '0x421234',
      block_height: 333,
      canonical: true,
      event_type: DbEventTypeId.SmartContractLog,
      contract_identifier: 'some-contract-id',
      topic: 'some-topic',
      value: Buffer.from('some val'),
    };
    const smartContract1: DbSmartContract = {
      tx_id: '0x421234',
      canonical: true,
      block_height: 333,
      contract_id: 'some-contract-id',
      source_code: '(some-contract-src)',
      abi: '{"some-abi":1}',
    };
    await db.update({
      block: block1,
      txs: [
        {
          tx: tx1,
          stxEvents: [stxEvent1],
          ftEvents: [ftEvent1],
          nftEvents: [nftEvent1],
          contractLogEvents: [contractLogEvent1],
          smartContracts: [smartContract1],
        },
      ],
    });
    await db.update({
      block: block2,
      txs: [
        {
          tx: tx2,
          stxEvents: [],
          ftEvents: [],
          nftEvents: [],
          contractLogEvents: [],
          smartContracts: [],
        },
      ],
    });

    const fetchTx1 = await db.getTx(tx1.tx_id);
    assert(fetchTx1.found);
    expect(fetchTx1.result.canonical).toBe(true);

    const fetchBlock1 = await db.getBlock(block1.block_hash);
    assert(fetchBlock1.found);
    expect(fetchBlock1.result.canonical).toBe(true);

    const newChainBlock: DbBlock = {
      ...block1,
      block_height: 333,
      block_hash: '0x1111',
      index_block_hash: '0x2222',
    };
    const reorgResults = await db.handleReorg(client, newChainBlock);
    expect(reorgResults).toEqual({
      blocks: 2,
      txs: 2,
      stxEvents: 1,
      ftEvents: 1,
      nftEvents: 1,
      contractLogs: 1,
      smartContracts: 1,
    });

    const fetchOrphanTx1 = await db.getTx(tx1.tx_id);
    assert(fetchOrphanTx1.found);
    expect(fetchOrphanTx1.result.canonical).toBe(false);

    const fetchOrphanBlock1 = await db.getBlock(block1.block_hash);
    assert(fetchOrphanBlock1.found);
    expect(fetchOrphanBlock1.result.canonical).toBe(false);

    const fetchOrphanEvents = await db.getTxEvents(tx1.tx_id, tx1.index_block_hash);
    expect(fetchOrphanEvents.results).toHaveLength(4);
    expect(fetchOrphanEvents.results.find(e => e.event_index === 1)).toEqual({
      ...stxEvent1,
      canonical: false,
    });
    expect(fetchOrphanEvents.results.find(e => e.event_index === 2)).toEqual({
      ...ftEvent1,
      canonical: false,
    });
    expect(fetchOrphanEvents.results.find(e => e.event_index === 3)).toEqual({
      ...nftEvent1,
      canonical: false,
    });
    expect(fetchOrphanEvents.results.find(e => e.event_index === 4)).toEqual({
      ...contractLogEvent1,
      canonical: false,
    });
  });

  afterEach(async () => {
    client.release();
    await db?.close();
    await runMigrations(undefined, 'down');
  });
});
