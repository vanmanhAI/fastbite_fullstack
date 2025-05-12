import { AppDataSource } from "./config/database";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function runMigrations() {
  try {
    console.log("Initializing database connection...");
    await AppDataSource.initialize();
    
    console.log("Running migrations...");
    const migrations = await AppDataSource.runMigrations();
    
    console.log(`Successfully ran ${migrations.length} migrations:`);
    migrations.forEach(migration => {
      console.log(`- ${migration.name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

runMigrations(); 