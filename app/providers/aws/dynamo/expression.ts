import * as DC from "./document_client.d";

export type Expression = {
    express: string,
    keys: {
        names: DC.ExpressionAttributeNames,
        values: DC.ExpressionAttributeValues
    }
};

export class ExpressionMap {
    static joinAll(pairs: { [key: string]: DC.ColumnValueElement }, join?: string, sign?: string): Expression {
        if (!join) join = "AND";
        if (!sign) sign = "=";
        const rels = new Array<string>();
        const result = new ExpressionMap();
        Object.keys(pairs).forEach((n) => {
            const name = result.addName(n);
            const value = result.addValue(pairs[n]);
            rels.push([name, sign, value].join(" "));
        });
        return { express: rels.join(` ${join} `), keys: result };
    }

    private _names: { [key: string]: string } = {};
    private _values: { [key: string]: DC.ColumnValueElement } = {};

    addName(name: string): string {
        const key = `#N${Object.keys(this._names).length}`;
        this._names[key] = name;
        return key;
    }

    addValue(value: DC.ColumnValueElement): string {
        const key = `:V${Object.keys(this._values).length}`;
        this._values[key] = value;
        return key;
    }

    get names(): DC.ExpressionAttributeNames {
        return this._names;
    }

    get values(): DC.ExpressionAttributeValues {
        return this._values;
    }
}
