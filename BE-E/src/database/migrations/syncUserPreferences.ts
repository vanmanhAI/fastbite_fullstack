import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncUserPreferences1694836152000 implements MigrationInterface {
    name = 'SyncUserPreferences1694836152000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Kiểm tra xem có sự không nhất quán giữa bảng user_preferences và trường preferences trong users
        const userPreferencesExist = await queryRunner.query(`SELECT COUNT(*) as count FROM user_preferences`);
        
        if (userPreferencesExist[0].count > 0) {
            // Nếu có dữ liệu trong bảng user_preferences, chuyển đổi sang định dạng JSON và cập nhật vào bảng users
            console.log("Migrating user preferences from separate table to JSON field in users table...");
            
            // Lấy danh sách preferences
            const preferences = await queryRunner.query(`SELECT * FROM user_preferences`);
            
            for (const pref of preferences) {
                const userId = pref.user_id;
                
                // Chuyển đổi các trường thành định dạng JSON
                const preferenceObject = {
                    favoriteCategories: pref.categoryPreferences ? pref.categoryPreferences.split(',') : [],
                    dietaryRestrictions: pref.dietaryRestrictions ? pref.dietaryRestrictions.split(',') : [],
                    tastePreferences: {
                        spicy: pref.tastePreferences && pref.tastePreferences.includes('cay'),
                        sweet: pref.tastePreferences && pref.tastePreferences.includes('ngọt'),
                        sour: pref.tastePreferences && pref.tastePreferences.includes('chua'),
                        bitter: pref.tastePreferences && pref.tastePreferences.includes('đắng'),
                        savory: pref.tastePreferences && pref.tastePreferences.includes('umami'),
                    },
                    notificationSettings: {
                        email: true,
                        promotions: true,
                        orderUpdates: true
                    },
                    priceRangeMin: pref.priceRangeMin,
                    priceRangeMax: pref.priceRangeMax
                };
                
                // Cập nhật vào bảng users
                await queryRunner.query(
                    `UPDATE users SET preferences = ? WHERE id = ?`,
                    [JSON.stringify(preferenceObject), userId]
                );
            }
        }
        
        // Thiết lập cấu trúc mặc định cho các người dùng chưa có preferences
        await queryRunner.query(`
            UPDATE users 
            SET preferences = '{"favoriteCategories":[],"dietaryRestrictions":[],"tastePreferences":{"spicy":false,"sweet":false,"sour":false,"bitter":false,"savory":false},"notificationSettings":{"email":true,"promotions":true,"orderUpdates":true}}'
            WHERE preferences IS NULL
        `);
        
        // Không xóa bảng user_preferences, chỉ đánh dấu là không sử dụng
        // Có thể xóa sau khi đã kiểm tra mọi thứ hoạt động tốt
        console.log("User preferences migration completed successfully.");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Không cần rollback vì chúng ta không xóa hoặc thay đổi cấu trúc
        console.log("No rollback needed for user preferences migration.");
    }
} 