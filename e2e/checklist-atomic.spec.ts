// Favorites regression follows the current backend migration.
// Sequential feature gate: Mix original + new audio
import { test, expect, APIRequestContext, Page } from '@playwright/test';
import fs from 'node:fs/promises';