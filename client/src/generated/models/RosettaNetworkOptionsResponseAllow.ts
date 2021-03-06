/* tslint:disable */
/* eslint-disable */
/**
 * Stacks 2.0 Blockchain API
 * This is the documentation for the Stacks 2.0 Blockchain API.  It is comprised of two parts; the Stacks Blockchain API and the Stacks Core API.  [![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/614feab5c108d292bffa#?env%5BStacks%20Blockchain%20API%5D=W3sia2V5Ijoic3R4X2FkZHJlc3MiLCJ2YWx1ZSI6IlNUMlRKUkhESE1ZQlE0MTdIRkIwQkRYNDMwVFFBNVBYUlg2NDk1RzFWIiwiZW5hYmxlZCI6dHJ1ZX0seyJrZXkiOiJibG9ja19pZCIsInZhbHVlIjoiMHgiLCJlbmFibGVkIjp0cnVlfSx7ImtleSI6Im9mZnNldCIsInZhbHVlIjoiMCIsImVuYWJsZWQiOnRydWV9LHsia2V5IjoibGltaXRfdHgiLCJ2YWx1ZSI6IjIwMCIsImVuYWJsZWQiOnRydWV9LHsia2V5IjoibGltaXRfYmxvY2siLCJ2YWx1ZSI6IjMwIiwiZW5hYmxlZCI6dHJ1ZX0seyJrZXkiOiJ0eF9pZCIsInZhbHVlIjoiMHg1NDA5MGMxNmE3MDJiNzUzYjQzMTE0ZTg4NGJjMTlhODBhNzk2MzhmZDQ0OWE0MGY4MDY4Y2RmMDAzY2RlNmUwIiwiZW5hYmxlZCI6dHJ1ZX0seyJrZXkiOiJjb250cmFjdF9pZCIsInZhbHVlIjoiU1RKVFhFSlBKUFBWRE5BOUIwNTJOU1JSQkdRQ0ZOS1ZTMTc4VkdIMS5oZWxsb193b3JsZFxuIiwiZW5hYmxlZCI6dHJ1ZX0seyJrZXkiOiJidGNfYWRkcmVzcyIsInZhbHVlIjoiYWJjIiwiZW5hYmxlZCI6dHJ1ZX0seyJrZXkiOiJjb250cmFjdF9hZGRyZXNzIiwidmFsdWUiOiJTVEpUWEVKUEpQUFZETkE5QjA1Mk5TUlJCR1FDRk5LVlMxNzhWR0gxIiwiZW5hYmxlZCI6dHJ1ZX0seyJrZXkiOiJjb250cmFjdF9uYW1lIiwidmFsdWUiOiJoZWxsb193b3JsZCIsImVuYWJsZWQiOnRydWV9LHsia2V5IjoiY29udHJhY3RfbWFwIiwidmFsdWUiOiJzdG9yZSIsImVuYWJsZWQiOnRydWV9LHsia2V5IjoiY29udHJhY3RfbWV0aG9kIiwidmFsdWUiOiJnZXQtdmFsdWUiLCJlbmFibGVkIjp0cnVlfV0=) 
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import {
    RosettaError,
    RosettaErrorFromJSON,
    RosettaErrorFromJSONTyped,
    RosettaErrorToJSON,
    RosettaOperationStatus,
    RosettaOperationStatusFromJSON,
    RosettaOperationStatusFromJSONTyped,
    RosettaOperationStatusToJSON,
} from './';

/**
 * Allow specifies supported Operation status, Operation types, and all possible error statuses. This Allow object is used by clients to validate the correctness of a Rosetta Server implementation. It is expected that these clients will error if they receive some response that contains any of the above information that is not specified here.
 * @export
 * @interface RosettaNetworkOptionsResponseAllow
 */
export interface RosettaNetworkOptionsResponseAllow {
    /**
     * All Operation.Status this implementation supports. Any status that is returned during parsing that is not listed here will cause client validation to error.
     * @type {Array<RosettaOperationStatus>}
     * @memberof RosettaNetworkOptionsResponseAllow
     */
    operation_statuses: Array<RosettaOperationStatus>;
    /**
     * All Operation.Type this implementation supports. Any type that is returned during parsing that is not listed here will cause client validation to error.
     * @type {Array<string>}
     * @memberof RosettaNetworkOptionsResponseAllow
     */
    operation_types: Array<string>;
    /**
     * All Errors that this implementation could return. Any error that is returned during parsing that is not listed here will cause client validation to error.
     * @type {Array<RosettaError>}
     * @memberof RosettaNetworkOptionsResponseAllow
     */
    errors: Array<RosettaError>;
    /**
     * Any Rosetta implementation that supports querying the balance of an account at any height in the past should set this to true.
     * @type {boolean}
     * @memberof RosettaNetworkOptionsResponseAllow
     */
    historical_balance_lookup: boolean;
}

export function RosettaNetworkOptionsResponseAllowFromJSON(json: any): RosettaNetworkOptionsResponseAllow {
    return RosettaNetworkOptionsResponseAllowFromJSONTyped(json, false);
}

export function RosettaNetworkOptionsResponseAllowFromJSONTyped(json: any, ignoreDiscriminator: boolean): RosettaNetworkOptionsResponseAllow {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'operation_statuses': ((json['operation_statuses'] as Array<any>).map(RosettaOperationStatusFromJSON)),
        'operation_types': json['operation_types'],
        'errors': ((json['errors'] as Array<any>).map(RosettaErrorFromJSON)),
        'historical_balance_lookup': json['historical_balance_lookup'],
    };
}

export function RosettaNetworkOptionsResponseAllowToJSON(value?: RosettaNetworkOptionsResponseAllow | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'operation_statuses': ((value.operation_statuses as Array<any>).map(RosettaOperationStatusToJSON)),
        'operation_types': value.operation_types,
        'errors': ((value.errors as Array<any>).map(RosettaErrorToJSON)),
        'historical_balance_lookup': value.historical_balance_lookup,
    };
}


