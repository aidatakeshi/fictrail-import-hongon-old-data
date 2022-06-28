import chalk from 'chalk';
import 'dotenv/config';
import pg from 'pg';
const Client = pg.Client;

async function getConnection(){
    try{
        const client_old = new Client({
            host: process.env.OLD_DB_HOST,
            database: process.env.OLD_DB_DATABASE,
            user: process.env.OLD_DB_USER,
            password: process.env.OLD_DB_PASSWORD,
            port: process.env.OLD_DB_PORT,
        });
        const client_new = new Client({
            host: process.env.NEW_DB_HOST,
            database: process.env.NEW_DB_DATABASE,
            user: process.env.NEW_DB_USER,
            password: process.env.NEW_DB_PASSWORD,
            port: process.env.NEW_DB_PORT,
        });
        await client_old.connect();
        await client_new.connect();
        return {client_old, client_new};

    }catch(error){
        console.log(chalk.red(error));
        process.exit(1);
    }
};

async function insertData(db_client, table, data = {}){
    let fields = [];
    let placeholders = [];
    let values = [];
    let i = 0;
    for (let field in data){
        fields.push(field);
        placeholders.push(`$${++i}`);
        if (typeof data[field] === 'object' && data[field] !== null){
            data[field] = JSON.stringify(data[field]);
        }
        values.push(data[field]);
    }
    const query = `INSERT INTO ${table}(${fields.join(', ')}) VALUES(${placeholders.join(', ')})`;
    await db_client.query(query, values);
}

async function getOperatorIDMapping(client_old, client_new){
    const res_old = await client_old.query(`SELECT name_chi, id FROM operators`, []);
    const res_new = await client_new.query(`SELECT name, id FROM _rail_operators WHERE project_id = 'hongon'`, []);
    let mapping_name_chi_new_id = {};
    for (let item of res_new.rows){
        mapping_name_chi_new_id[item.name] = item.id;
    }
    let mapping_old_id_new_id = {};
    for (let item of res_old.rows){
        mapping_old_id_new_id[item.id] = mapping_name_chi_new_id[item.name_chi] || undefined;
    }
    return mapping_old_id_new_id;
}

async function getRegionIDMapping(client_old, client_new){
    const res_old = await client_old.query(`SELECT name_chi, id FROM prefectures`, []);
    const res_new = await client_new.query(`SELECT name, id FROM _regions WHERE project_id = 'hongon'`, []);
    let mapping_name_chi_new_id = {};
    for (let item of res_new.rows){
        mapping_name_chi_new_id[item.name] = item.id;
    }
    let mapping_old_id_new_id = {};
    for (let item of res_old.rows){
        mapping_old_id_new_id[item.id] = mapping_name_chi_new_id[item.name_chi] || undefined;
    }
    return mapping_old_id_new_id;
}

function getLongitude(legacy_map_x){
    if (legacy_map_x === undefined || legacy_map_x === null) return null;
    const units_per_degree = 0.00223920462; //1/5000*9/cos(36.5 deg)
    return 158 + (legacy_map_x - 3500) * units_per_degree;
}

function getLatitude(legacy_map_y){
    if (legacy_map_y === undefined || legacy_map_y === null) return null;
    const units_per_degree = -0.00223920462; //-1/5000*9/cos(36.5 deg)
    return 36.5 + (legacy_map_y - 2500) * units_per_degree;
}

function getLongitudeShift(legacy_map_x){
    const units_per_degree = 0.00223920462; //1/5000*9/cos(36.5 deg)
    return legacy_map_x * units_per_degree;
}

function getLatitudeShift(legacy_map_y){
    const units_per_degree = -0.00223920462; //1/5000*9/cos(36.5 deg)
    return legacy_map_y * units_per_degree;
}

function getTextInsideBracket(string){
    const right_of_open_bracket = string.split('(')[1];
    if (right_of_open_bracket === undefined) return null;
    return right_of_open_bracket.split(')')[0];
}

export {
    getConnection,
    insertData,
    getOperatorIDMapping, getRegionIDMapping,
    getLongitude, getLatitude, getLongitudeShift, getLatitudeShift,
    getTextInsideBracket,
};