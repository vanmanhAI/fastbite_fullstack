import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncReviewModel1694836252000 implements MigrationInterface {
    name = 'SyncReviewModel1694836252000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Kiểm tra xem index đã tồn tại chưa
        const tableExists = await queryRunner.query(
            `SELECT * FROM information_schema.statistics 
             WHERE table_schema = DATABASE() 
             AND table_name = 'reviews' 
             AND index_name = 'IDX_USER_PRODUCT'`
        );

        if (tableExists.length === 0) {
            // Thêm index thông thường cho user_id và product_id
            await queryRunner.query(`
                CREATE INDEX IDX_USER_PRODUCT
                ON \`reviews\` (\`user_id\`, \`product_id\`)
            `);
            
            console.log("Index created for reviews table");
        } else {
            console.log("Index already exists for reviews table");
        }
        
        // Kiểm tra xem có đánh giá trùng lặp không
        const duplicateReviews = await queryRunner.query(`
            SELECT \`user_id\`, \`product_id\`, COUNT(*) as count
            FROM \`reviews\`
            GROUP BY \`user_id\`, \`product_id\`
            HAVING COUNT(*) > 1
        `);
        
        // Xóa các đánh giá trùng lặp, giữ lại cái mới nhất
        if (duplicateReviews.length > 0) {
            console.log(`Found ${duplicateReviews.length} duplicate review(s). Keeping only the newest for each user-product pair.`);
            
            for (const dup of duplicateReviews) {
                // Tìm các ID của các đánh giá trùng lặp
                const reviews = await queryRunner.query(`
                    SELECT \`id\`, \`created_at\`
                    FROM \`reviews\`
                    WHERE \`user_id\` = ${dup.user_id} AND \`product_id\` = ${dup.product_id}
                    ORDER BY \`created_at\` DESC
                `);
                
                // Giữ lại cái đầu tiên (mới nhất) và xóa các cái còn lại
                const keepId = reviews[0].id;
                const deleteIds = reviews.slice(1).map(r => r.id);
                
                if (deleteIds.length > 0) {
                    await queryRunner.query(`
                        DELETE FROM \`reviews\`
                        WHERE \`id\` IN (${deleteIds.join(',')})
                    `);
                    console.log(`Deleted ${deleteIds.length} duplicate reviews for user ${dup.user_id} and product ${dup.product_id}`);
                }
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Xóa index nếu cần
        await queryRunner.query(`
            DROP INDEX IF EXISTS IDX_USER_PRODUCT ON \`reviews\`
        `);
    }
} 