import { GraphQLClient, gql } from "graphql-request";

export function graph(endpoint: string) {
  return new GraphQLClient(endpoint, {
    // headers: { ... } // add if a provider requires an API key
  });
}

export { gql };