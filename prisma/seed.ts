import { PrismaClient } from "@prisma/client";
import * as bycrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(){
    console.log('Seeding database...');

    //Seedroles
    const roles = [
        {id: 1, name: 'ADMIN'},
        {id: 2, name: 'LEAGUE_ADMIN'},
        {id: 3, name: 'TEAM_MANAGER'},
        {id: 4, name: 'USER'},
    ];

    for(const role of roles){
        await prisma.roles.upsert({
            where: {id: role.id},
            update: {},
            create: role,
        });
    }

    console.log('Roles seeded');

    //Create admin user
    const adminEmail = 'admin@ingapirca.com';
    const adminPassword = 'admin123'; //CHANGE AFTER FIRST LOGIN

    const passwordHash = await bycrypt.hash(adminPassword, 12);

    const adminUser  = await prisma.users.upsert({
        where: {email:adminEmail},
        update: {},
        create: {
            email: adminEmail,
            password_hash: passwordHash,
            full_name: 'System Administrator',
            is_active: true,
        },
    });

    console.log('Admin user ensured');

    // Assign ADMIN role

    await prisma.user_roles.upsert({
        where: {
            user_id_role_id: {
                user_id: adminUser.id,
                role_id: 1, //ADMIN
            },
        },
        update: {},
        create: {
            user_id: adminUser.id,
            role_id: 1,
        },
    });

    console.log('ADMIN role assigned');

    console.log('Seeding completed');
}

main()
    .catch((e)=>{
        console.error(e);
        process.exit(1);
    })
    .finally(async ()=>{
        await prisma.$disconnect();
    });