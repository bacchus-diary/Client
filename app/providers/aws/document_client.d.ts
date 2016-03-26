
type ClientCallback<T> = (err, data: T) => void;

interface AWSRequest<T> {
    send(callback: ClientCallback<T>): void;
}

interface DocumentClient {
    batchGet(params, callback?: ClientCallback<any>): AWSRequest<any>;
    batchWrite(params, callback?: ClientCallback<any>): AWSRequest<any>;
    createSet(list: Array<any>, params?: { validate: boolean }): any;
    delete(params: DeleteParams, callback?: ClientCallback<DeleteResult>): AWSRequest<DeleteResult>;
    get(params: GetParams, callback?: ClientCallback<GetResult>): AWSRequest<GetResult>;
    put(params: PutParams, callback?: ClientCallback<PutResult>): AWSRequest<PutResult>;
    query(params: QueryParams, callback?: ClientCallback<QueryResult>): AWSRequest<QueryResult>;
    scan(params: ScanParams, callback?: ClientCallback<ScanResult>): AWSRequest<ScanResult>;
    update(params: UpdateParams, callback?: ClientCallback<UpdateResult>): AWSRequest<UpdateResult>;
}

////////////////////////////////////////////////////////////////
// For delete
////////////////////////////////////////////////////////////////

type DeleteParams = {
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

type DeleteResult = {
    Attributes: Item,
    ConsumedCapacity: ConsumedCapacity,
    ItemCollectionMetrics: ItemCollectionMetrics
}

////////////////////////////////////////////////////////////////
// For get
////////////////////////////////////////////////////////////////

type GetParams = {
    Key: Key,
    TableName: string,
    AttributesToGet?: string[],
    ConsistentRead?: boolean,
    ExpressionAttributeNames?: ExpressionAttributeNames,
    ProjectionExpression?: string,
    ReturnConsumedCapacity?: ReturnConsumedCapacity
}

type GetResult = {
    Item: Item,
    ConsumedCapacity: ConsumedCapacity,
}

////////////////////////////////////////////////////////////////
// For put
////////////////////////////////////////////////////////////////

type PutParams = {
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

type PutResult = {
    Attributes: Item,
    ConsumedCapacity: ConsumedCapacity,
    ItemCollectionMetrics: ItemCollectionMetrics
}

////////////////////////////////////////////////////////////////
// For query
////////////////////////////////////////////////////////////////

type QueryParams = {
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

type QueryResult = {
    Items: Item[],
    Count: number,
    ScannedCount: number,
    LastEvaluatedKey: Item,
    ConsumedCapacity: ConsumedCapacity
}

////////////////////////////////////////////////////////////////
// For scan
////////////////////////////////////////////////////////////////

type ScanParams = {
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

type ScanResult = {
    Items: Item[],
    Count: number,
    ScannedCount: number,
    LastEvaluatedKey: Item,
    ConsumedCapacity: ConsumedCapacity
}

////////////////////////////////////////////////////////////////
// For update
////////////////////////////////////////////////////////////////

type UpdateParams = {
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

type UpdateResult = {
    Attributes: Item,
    ConsumedCapacity: ConsumedCapacity,
    ItemCollectionMetrics: ItemCollectionMetrics
}

////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
// Basic types
////////////////////////////////////////////////////////////////


type ReturnConsumedCapacity = 'INDEXES' | 'TOTAL' | 'NONE';

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
type ConsumedCapacity = any;

/**
 * (map)
 * ItemCollectionKey — (map<map>) — a serializable JavaScript object. For information about the supported types see the DynamoDB Data Model
 * SizeEstimateRangeGB — (Array<Float>)
 */
type ItemCollectionMetrics = any;

/**
 * (map<map>) — a serializable JavaScript object. For information about the supported types see the DynamoDB Data Model
 * (http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DataModel.html)
 */
type Item = any;

/**
 * map {
 *    someKey: someValue "str" | 10 | true | false | null | [1, "a"] | {a: "b"},
 *    anotherKey: ...
 *}
 */
type Key = any;

/**
 * map {
 *    someKey: 'STRING_VALUE',
 *    anotherKey: ...
 * }
 */
type ExpressionAttributeNames = any;

/**
 * map {
 *    someKey: someValue // "str" | 10 | true | false | null | [1, "a"] | {a: "b"},
 *    anotherKey: ...
 * }
 */
type ExpressionAttributeValues = any;

type ConditionalOperator = 'AND' | 'OR';

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
type Expected = any;

type ReturnItemCollectionMetrics = 'SIZE' | 'NONE';

type ReturnValues = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';

type Select = 'ALL_ATTRIBUTES' | 'ALL_PROJECTED_ATTRIBUTES' | 'SPECIFIC_ATTRIBUTES' | 'COUNT';

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
type Filter = any;

/**
 * {
 *   someKey: {
 *     Action: 'ADD | PUT | DELETE',
 *     Value: someValue, // "str" | 10 | true | false | null | [1, "a"] | {a: "b"}
 *   },
 *   // anotherKey: ...
}
*/
type AttributeUpdates = any;
