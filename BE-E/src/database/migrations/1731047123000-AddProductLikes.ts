import { MigrationInterface, QueryRunner } from "typeorm"

export class AddProductLikes1731047123000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Kiểm tra xem bảng product_likes đã tồn tại chưa
        const tableExists = await queryRunner.query(
            `SELECT * FROM information_schema.tables 
             WHERE table_schema = DATABASE() 
             AND table_name = 'product_likes'`
        );

        if (tableExists.length === 0) {
            // Tạo bảng product_likes nếu chưa tồn tại
            await queryRunner.query(`
                CREATE TABLE product_likes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    product_id INT NOT NULL,
                    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                    UNIQUE KEY unique_user_product (user_id, product_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                )
            `);
            console.log("Bảng product_likes đã được tạo thành công");
        } else {
            console.log("Bảng product_likes đã tồn tại");
        }

        // Kiểm tra xem cột like_count đã tồn tại trong bảng products chưa
        const columnExists = await queryRunner.query(
            `SELECT * FROM information_schema.columns 
             WHERE table_schema = DATABASE() 
             AND table_name = 'products' 
             AND column_name = 'like_count'`
        );

        if (columnExists.length === 0) {
            // Thêm cột like_count vào bảng products nếu chưa tồn tại
            await queryRunner.query(`
                ALTER TABLE products
                ADD COLUMN like_count INT NOT NULL DEFAULT 0
            `);
            console.log("Đã thêm cột like_count vào bảng products");
        } else {
            console.log("Cột like_count đã tồn tại trong bảng products");
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Xóa foreign key trước
        await queryRunner.query(`
            ALTER TABLE product_likes 
            DROP FOREIGN KEY IF EXISTS product_likes_ibfk_1,
            DROP FOREIGN KEY IF EXISTS product_likes_ibfk_2
        `);

        // Xóa bảng product_likes
        await queryRunner.query(`DROP TABLE IF EXISTS product_likes`);

        // Xóa cột like_count khỏi bảng products
        await queryRunner.query(`
            ALTER TABLE products
            DROP COLUMN IF EXISTS like_count
        `);
    }

} 