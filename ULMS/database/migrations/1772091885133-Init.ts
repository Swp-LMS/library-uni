import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class Init1772091885133 implements MigrationInterface {
    name = 'Init1772091885133'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 🔹 1. Update enum role an toàn
        await queryRunner.query(`
            ALTER TABLE \`users\`
            CHANGE \`role\` \`role\`
            ENUM('admin','librarian','readers','student')
            NOT NULL DEFAULT 'student'
        `);

        await queryRunner.query(`
            UPDATE \`users\`
            SET \`role\` = 'student'
            WHERE \`role\` = 'readers'
        `);

        await queryRunner.query(`
            ALTER TABLE \`users\`
            CHANGE \`role\` \`role\`
            ENUM('admin','librarian','student')
            NOT NULL DEFAULT 'student'
        `);

        // 🔹 2. Drop avatar_url nếu tồn tại
        const userTable = await queryRunner.getTable('users');
        const hasAvatarUrl = userTable?.findColumnByName('avatar_url');

        if (hasAvatarUrl) {
            await queryRunner.query(`
                ALTER TABLE \`users\`
                DROP COLUMN \`avatar_url\`
            `);
        }

        // 🔹 3. Drop face_url nếu tồn tại
        const hasFaceUrl = userTable?.findColumnByName('face_url');

        if (hasFaceUrl) {
            await queryRunner.query(`
                ALTER TABLE \`users\`
                DROP COLUMN \`face_url\`
            `);
        }

        // 🔹 4. Update boolean fields
        await queryRunner.query(`
            ALTER TABLE \`membership_plans\`
            CHANGE \`is_active\` \`is_active\`
            tinyint(1) NOT NULL DEFAULT 1
        `);

        await queryRunner.query(`
            ALTER TABLE \`users\`
            CHANGE \`has_used_basic_trial\` \`has_used_basic_trial\`
            tinyint(1) NOT NULL DEFAULT 0
        `);

        await queryRunner.query(`
            ALTER TABLE \`users\`
            CHANGE \`has_used_upgrade_promo\` \`has_used_upgrade_promo\`
            tinyint(1) NOT NULL DEFAULT 0
        `);

        await queryRunner.query(`
            ALTER TABLE \`users\`
            CHANGE \`is_blacklisted\` \`is_blacklisted\`
            tinyint(1) NOT NULL DEFAULT 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 🔹 Revert boolean fields
        await queryRunner.query(`
            ALTER TABLE \`users\`
            CHANGE \`is_blacklisted\` \`is_blacklisted\`
            tinyint NOT NULL DEFAULT '0'
        `);

        await queryRunner.query(`
            ALTER TABLE \`users\`
            CHANGE \`has_used_upgrade_promo\` \`has_used_upgrade_promo\`
            tinyint NOT NULL DEFAULT '0'
        `);

        await queryRunner.query(`
            ALTER TABLE \`users\`
            CHANGE \`has_used_basic_trial\` \`has_used_basic_trial\`
            tinyint NOT NULL DEFAULT '0'
        `);

        await queryRunner.query(`
            ALTER TABLE \`membership_plans\`
            CHANGE \`is_active\` \`is_active\`
            tinyint NOT NULL DEFAULT '1'
        `);

        // 🔹 Add columns back (rollback)
        await queryRunner.query(`
            ALTER TABLE \`users\`
            ADD \`face_url\` varchar(255) NULL
        `);

        await queryRunner.query(`
            ALTER TABLE \`users\`
            ADD \`avatar_url\` varchar(255) NULL
        `);

        // 🔹 Revert enum role
        await queryRunner.query(`
            ALTER TABLE \`users\`
            CHANGE \`role\` \`role\`
            ENUM('admin','librarian','readers')
            NOT NULL DEFAULT 'readers'
        `);
    }
}