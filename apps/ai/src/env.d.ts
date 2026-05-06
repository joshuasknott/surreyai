/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    convexClient?: any;
    user?: {
      _id: string;
      name: string;
      email: string;
      role: string;
    };
    societySlug?: string;
  }
}
