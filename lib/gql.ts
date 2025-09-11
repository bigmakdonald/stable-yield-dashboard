import { GraphQLClient, gql } from "graphql-request";

export function graph(endpoint: string, apiKey?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  return new GraphQLClient(endpoint, { headers });
}

export { gql };
