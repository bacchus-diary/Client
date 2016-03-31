
export type ClientCallback<T> = (err, data: T) => void;

export interface AWSRequest<T> {
    send(callback: ClientCallback<T>): void;
}

export type Operation<P, R> = (params: P, callback?: ClientCallback<R>) => AWSRequest<R>;

export interface DocumentClient {
    batchGet: Operation<BatchGetParams, BatchGetResult>
    batchWrite: Operation<BatchWriteParams, BatchWriteResult>
    createSet(list: Array<any>, params?: { validate: boolean }): any;
    delete: Operation<DeleteParams, DeleteResult>
    get: Operation<GetParams, GetResult>
    put: Operation<PutParams, PutResult>
    query: Operation<QueryParams, QueryResult>
    scan: Operation<ScanParams, ScanResult>
    update: Operation<UpdateParams, UpdateResult>
}

////////////////////////////////////////////////////////////////
// For batchGet
////////////////////////////////////////////////////////////////

export type BatchGetParams = {
    RequestItems: BatchGetRequestItems;
    ReturnConsumedCapacity?: ReturnConsumedCapacity
}

export type BatchGetResult = {
    Responses: BatchGetResponses,
    UnprocessedKeys: UnprocessedKeys,
    ConsumedCapacity: ConsumedCapacity
}

////////////////////////////////////////////////////////////////
// For batchGet
////////////////////////////////////////////////////////////////

export type BatchWriteParams = {
    RequestItems: BatchWriteRequestItems,
    ReturnConsumedCapacity?: ReturnConsumedCapacity,
    ReturnItemCollectionMetrics?: ReturnItemCollectionMetrics
}

export type BatchWriteResult = {
    UnprocessedItems: UnprocessedItems,
    ItemCollectionMetrics: ItemCollectionMetrics,
    ConsumedCapacity: ConsumedCapacity
}

////////////////////////////////////////////////////////////////
// For delete
////////////////////////////////////////////////////////////////

export type DeleteParams = {
    Key: any,
    TableName: string,
    ConditionExpression?: string,
    ConditionalOperator?: ConditionalOperator,
    Expected?: Expected,
    ExpressionAttributeNames?: ExpressionAttributeNames,
    ExpressionAttributeValues?: ExpressionAttributeValues,
    ReturnConsumedCapacity?: ReturnConsumedCapacity,
    ReturnItemCollectionMetrics?: ReturnItemCollectionMetrics,
    ReturnValues?: ReturnValues
};

export type DeleteResult = {
    Attributes: Item,
    ConsumedCapacity: ConsumedCapacity,
    ItemCollectionMetrics: ItemCollectionMetrics
}

////////////////////////////////////////////////////////////////
// For get
////////////////////////////////////////////////////////////////

export type GetParams = {
    Key: Key,
    TableName: string,
    AttributesToGet?: string[],
    ConsistentRead?: boolean,
    ExpressionAttributeNames?: ExpressionAttributeNames,
    ProjectionExpression?: string,
    ReturnConsumedCapacity?: ReturnConsumedCapacity
}

export type GetResult = {
    Item: Item,
    ConsumedCapacity: ConsumedCapacity,
}

////////////////////////////////////////////////////////////////
// For put
////////////////////////////////////////////////////////////////

export type PutParams = {
    Item: Key,
    TableName: string,
    ConditionExpression?: string,
    ConditionalOperator?: ConditionalOperator,
    Expected?: Expected,
    ExpressionAttributeNames?: ExpressionAttributeNames,
    ExpressionAttributeValues?: ExpressionAttributeValues,
    ReturnConsumedCapacity?: ReturnConsumedCapacity,
    ReturnItemCollectionMetrics?: ReturnItemCollectionMetrics,
    ReturnValues?: ReturnValues
}

export type PutResult = {
    Attributes: Item,
    ConsumedCapacity: ConsumedCapacity,
    ItemCollectionMetrics: ItemCollectionMetrics
}

////////////////////////////////////////////////////////////////
// For query
////////////////////////////////////////////////////////////////

export type QueryParams = {
    TableName: string,
    AttributesToGet?: string[],
    ConditionalOperator?: ConditionalOperator,
    ConsistentRead?: boolean,
    ExclusiveStartKey?: Key,
    ExpressionAttributeNames?: ExpressionAttributeNames,
    ExpressionAttributeValues?: ExpressionAttributeValues,
    FilterExpression?: string,
    IndexName?: string,
    KeyConditionExpression?: string,
    KeyConditions?: Filter,
    Limit?: number,
    ProjectionExpression?: string,
    QueryFilter?: Filter,
    ReturnConsumedCapacity?: ReturnConsumedCapacity,
    ScanIndexForward?: boolean,
    Select?: Select
}

export type QueryResult = {
    Items: Item[],
    Count: number,
    ScannedCount: number,
    LastEvaluatedKey: Item,
    ConsumedCapacity: ConsumedCapacity
}

////////////////////////////////////////////////////////////////
// For scan
////////////////////////////////////////////////////////////////

export type ScanParams = {
    TableName: string,
    AttributesToGet?: string[],
    ConditionalOperator?: ConditionalOperator,
    ConsistentRead?: boolean,
    ExclusiveStartKey?: Key,
    ExpressionAttributeNames?: ExpressionAttributeNames,
    ExpressionAttributeValues?: ExpressionAttributeValues,
    FilterExpression?: string,
    IndexName?: string,
    Limit?: number,
    ProjectionExpression?: string,
    ReturnConsumedCapacity?: ReturnConsumedCapacity,
    ScanFilter?: Filter,
    Segment?: number,
    Select?: Select,
    TotalSegments?: number
}

export type ScanResult = {
    Items: Item[],
    Count: number,
    ScannedCount: number,
    LastEvaluatedKey: Item,
    ConsumedCapacity: ConsumedCapacity
}

////////////////////////////////////////////////////////////////
// For update
////////////////////////////////////////////////////////////////

export type UpdateParams = {
    Key: Key,
    TableName: string,
    AttributeUpdates?: AttributeUpdates,
    ConditionExpression?: string,
    ConditionalOperator?: ConditionalOperator,
    Expected?: Expected,
    ExpressionAttributeNames?: ExpressionAttributeNames,
    ExpressionAttributeValues?: ExpressionAttributeValues,
    ReturnConsumedCapacity?: ReturnConsumedCapacity,
    ReturnItemCollectionMetrics?: ReturnItemCollectionMetrics,
    ReturnValues?: ReturnValues,
    UpdateExpression?: string
}

export type UpdateResult = {
    Attributes: Item,
    ConsumedCapacity: ConsumedCapacity,
    ItemCollectionMetrics: ItemCollectionMetrics
}

////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
// Basic types
////////////////////////////////////////////////////////////////


export type ReturnConsumedCapacity = 'INDEXES' | 'TOTAL' | 'NONE';

/**
 * (map)
 * TableName — (String)
 * CapacityUnits — (Float)
 * Table — (map)
 *     CapacityUnits — (Float)
 * LocalSecondaryIndexes — (map<map>)
 *     CapacityUnits — (Float)
 * GlobalSecondaryIndexes — (map<map>)
 *     CapacityUnits — (Float)
 */
export type ConsumedCapacity = any;

/**
 * (map)
 * ItemCollectionKey — (map<map>) — a serializable JavaScript object. For information about the supported types see the DynamoDB Data Model
 * SizeEstimateRangeGB — (Array<Float>)
 */
export type ItemCollectionMetrics = any;

/**
 * (map<map>) — a serializable JavaScript object. For information about the supported types see the DynamoDB Data Model
 * (http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DataModel.html)
 */
export type Item = any;

/**
 * map {
 *    someKey: someValue "str" | 10 | true | false | null | [1, "a"] | {a: "b"},
 *    anotherKey: ...
 *}
 */
export type Key = any;

/**
 * map {
 *    someKey: 'STRING_VALUE',
 *    anotherKey: ...
 * }
 */
export type ExpressionAttributeNames = any;

/**
 * map {
 *    someKey: someValue // "str" | 10 | true | false | null | [1, "a"] | {a: "b"},
 *    anotherKey: ...
 * }
 */
export type ExpressionAttributeValues = any;

export type ConditionalOperator = 'AND' | 'OR';

/*{
    someKey: {
        AttributeValueList: [
            someValue "str" | 10 | true | false | null | [1, "a"] | {a: "b"},
            more items
        ],
        ComparisonOperator: 'EQ | NE | IN | LE | LT | GE | GT | BETWEEN | NOT_NULL | NULL | CONTAINS | NOT_CONTAINS | BEGINS_WITH',
        Exists: true || false,
            Value: someValue "str" | 10 | true | false | null | [1, "a"] | {a: "b"}
    },
    anotherKey: ...
}*/
export type Expected = any;

export type ReturnItemCollectionMetrics = 'SIZE' | 'NONE';

export type ReturnValues = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';

export type Select = 'ALL_ATTRIBUTES' | 'ALL_PROJECTED_ATTRIBUTES' | 'SPECIFIC_ATTRIBUTES' | 'COUNT';

/**
 * {
 *   someKey: {
 *     ComparisonOperator: 'EQ | NE | IN | LE | LT | GE | GT | BETWEEN | NOT_NULL | NULL | CONTAINS | NOT_CONTAINS | BEGINS_WITH', // required
 *     AttributeValueList: [
 *       someValue, // "str" | 10 | true | false | null | [1, "a"] | {a: "b"}
 *       more items ...
 *     ]
 *   },
 *   // anotherKey: ...
 * }
 */
export type Filter = any;

/**
 * {
 *   someKey: {
 *     Action: 'ADD | PUT | DELETE',
 *     Value: someValue, // "str" | 10 | true | false | null | [1, "a"] | {a: "b"}
 *   },
 *   // anotherKey: ...
 * }
 */
export type AttributeUpdates = any;

/**
 * {
 *     someKey: {
 *       Keys: [ // required
 *         {
 *           someKey: someValue, // "str" | 10 | true | false | null | [1, "a"] | {a: "b"}
 *           anotherKey: ...
 *         },
 *         more items ...
 *       ],
 *       AttributesToGet: [
 *         'STRING_VALUE',
 *         more items ...
 *       ],
 *       ConsistentRead: true || false,
 *       ExpressionAttributeNames: {
 *         someKey: 'STRING_VALUE',
 *         anotherKey: ...
 *       },
 *       ProjectionExpression: 'STRING_VALUE'
 *     },
 *     anotherKey: ...
 * }
 */
export type BatchGetRequestItems = any;

export type BatchGetResponses = Map<string, Array<Item>>;

/**
 * {
 *   someKey: [
 *     {
 *       DeleteRequest: {
 *         Key: { // required
 *           someKey: someValue, // "str" | 10 | true | false | null | [1, "a"] | {a: "b"}
 *           anotherKey: ...
 *         }
 *       },
 *       PutRequest: {
 *         Item: { // required
 *           someKey: someValue, // "str" | 10 | true | false | null | [1, "a"] | {a: "b"}
 *           anotherKey: ...
 *         }
 *       }
 *     },
 *     more items ...
 *   ],
 *   anotherKey: ...
 * }
 */
export type BatchWriteRequestItems = any;

/**
 * (map<map>)
 * Keys — required — (Array<map<map>>) — a serializable JavaScript object. For information about the supported types see the DynamoDB Data Model
 * AttributesToGet — (Array<String>)
 * ConsistentRead — (Boolean)
 * ProjectionExpression — (String)
 * ExpressionAttributeNames — (map<String>)
 */
export type UnprocessedKeys = any;

/**
 * (map<Array<map>>)
 * PutRequest — (map)
 *     Item — required — (map<map>) — a serializable JavaScript object. For information about the supported types see the DynamoDB Data Model
 * DeleteRequest — (map)
 *     Key — required — (map<map>) — a serializable JavaScript object. For information about the supported types see the DynamoDB Data Model
 */
export type UnprocessedItems = any;
