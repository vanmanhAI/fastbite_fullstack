import { MigrationInterface, QueryRunner } from "typeorm"

export class RemoveUserPreferences1744983201000 implements MigrationInterface {
    name = 'RemoveUserPreferences1744983201000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Di chuyển thông tin từ bảng user_preferences lên trường preferences trong bảng users (nếu cần)
        const preferences = await queryRunner.query(`SELECT * FROM user_preferences`);
        
        // Tạo cache cho việc cập nhật dữ liệu
        const userPreferencesMap: Record<number, any> = {};
        
        // Xử lý từng hàng dữ liệu trong bảng user_preferences
        for (const pref of preferences) {
            const userId = pref.userId;
            
            if (!userPreferencesMap[userId]) {
                userPreferencesMap[userId] = {
                    favoriteCategories: [],
                    dietaryRestrictions: [],
                    tastePreferences: {
                        spicy: false,
                        sweet: false,
                        sour: false,
                        bitter: false,
                        savory: false
                    },
                    notificationSettings: {
                        email: true,
                        promotions: true,
                        orderUpdates: true
                    }
                };
            }
            
            // Cập nhật thông tin dựa vào loại preference
            if (pref.preferenceType === 'favorite_category' && pref.categoryId) {
                userPreferencesMap[userId].favoriteCategories.push(pref.categoryId.toString());
            } else if (pref.preferenceType === 'dietary') {
                userPreferencesMap[userId].dietaryRestrictions.push(pref.value);
            } else if (pref.preferenceType === 'spicy_level') {
                userPreferencesMap[userId].tastePreferences.spicy = true;
            }
        }
        
        // Cập nhật bảng users với thông tin preferences đã kết hợp
        for (const userId in userPreferencesMap) {
            await queryRunner.query(
                `UPDATE users SET preferences = ? WHERE id = ?`,
                [JSON.stringify(userPreferencesMap[userId]), userId]
            );
        }
        
        // Kiểm tra và xóa các khóa ngoại trỏ đến bảng user_preferences
        try {
            // Lấy danh sách các foreign key
            const foreignKeys = await queryRunner.query(`
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'user_preferences' 
                AND REFERENCED_TABLE_NAME IS NOT NULL
            `);
            
            // Xóa từng foreign key
            for (const fk of foreignKeys) {
                await queryRunner.query(`ALTER TABLE user_preferences DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
                console.log(`Đã xóa foreign key ${fk.CONSTRAINT_NAME}`);
            }
        } catch (error) {
            console.log("Không tìm thấy foreign key hoặc có lỗi khi xóa:", error);
        }
        
        // Xóa bảng user_preferences
        await queryRunner.query(`DROP TABLE IF EXISTS user_preferences`);
        
        console.log("Đã xóa bảng user_preferences thành công");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Tạo lại bảng user_preferences nếu cần rollback
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId INT NOT NULL,
                preferenceType ENUM('dietary', 'allergen', 'favorite_category', 'favorite_meal', 'spicy_level', 'price_range', 'other') NOT NULL,
                categoryId INT NULL,
                value VARCHAR(100) NOT NULL,
                weight DECIMAL(5,2) DEFAULT 1.0 NOT NULL,
                createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
            )
        `);
        
        // Tạo index
        await queryRunner.query(`CREATE INDEX IDX_user_preferences_userId_preferenceType ON user_preferences (userId, preferenceType)`);
        
        console.log("Đã khôi phục bảng user_preferences");
    }
} 