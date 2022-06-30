import chalk from 'chalk';
import boxen from 'boxen';
import * as $ from './common.js';
import { v4 as uuid } from 'uuid';

const {client_old, client_new} = await $.getConnection();

//Find name -> id mapping for _rail_operators data
const operator_id_mapping = await $.getOperatorIDMapping(client_old, client_new);

if (!Object.keys(operator_id_mapping).length){
    console.log(chalk.red('Please import-rail-operators first.'));
    console.log('');
    process.exit(1);
}

/**
 * [Old] line_types
 * [New] _rail_line_types
 */

//Get Old Data
const res1 = await client_old.query('SELECT * FROM line_types', []);
const line_types = res1.rows;

//Map Old IDs to New UUIDs
let line_types_id_uuid = {};
for (let item of line_types){
    line_types_id_uuid[item.id] = uuid();
}

//Remove Old Items
await client_new.query('DELETE FROM _rail_line_types WHERE project_id = \'hongon\'', []);

//Insert to New Database
console.log(boxen('RailLineTypes (originally LineTypes)'));

for (let i = 0; i < line_types.length; i++){
    const item = line_types[i];
    await $.insertData(client_new, '_rail_line_types', {
        id: line_types_id_uuid[item.id],
        project_id: 'hongon',
        name: item.name_chi,
        name_l: { "en": item.name_eng },
        map_color: item.color,
        map_thickness: item.major ? 3 : 2,
        sort: item.sort,
        remarks: item.remarks,
        _names: `|${item.name_chi||''}|${item.name_eng||''}`,
        created_at: Math.floor(new Date().getTime() / 1000),
        created_by: 'hongon',
    });
    console.log(chalk.yellow(`#${i}: `) + `${item.name_chi} / ${item.name_eng}`);
}
console.log("");

/**
 * [Old] line_groups, lines, line_stations
 * [New] _rail_lines, _rail_lines_sub
 */

//Get line_groups & lines
const query2 = `select line_groups.name_chi as "g_name_chi", line_groups.name_eng as "g_name_eng", 
line_groups.name_eng_short as "g_name_eng_short", lines.* from lines
left join line_groups on lines.line_group_id = line_groups.id
order by line_group_id`;
const res2 = await client_old.query(query2, []);
const lines = res2.rows;

//Get line_stations
const query3 = `select * from lines_stations order by line_id, sort`;
const res3 = await client_old.query(query3, []);
let line_stations = {};
for (let item of res3.rows){
    const line_id = item.line_id;
    if (!line_stations[line_id]) line_stations[line_id] = [];
    line_stations[line_id].push(item);
}

//Remove Old Items
await client_new.query('DELETE FROM _rail_lines WHERE project_id = \'hongon\'', []);
await client_new.query('DELETE FROM _rail_lines_sub WHERE project_id = \'hongon\'', []);

//Prepare LineGroup -> RailLine Mapping
let line_group_mapping = {};
let rail_line_id;

//Insert to New Database
console.log(boxen('RailLines & RailLinesSub (originally LineGroups, Lines & LineStations)'));

for (let line of lines){

    //Determine line name & sub-line name
    const line_name_chi = line.line_group_id ? line.g_name_chi : line.name_chi;
    const line_name_eng = line.line_group_id ? line.g_name_eng : line.name_eng;
    const line_name_eng_short = line.g_name_eng_short || line.name_eng_short;
    const subline_name_chi = line.line_group_id ? $.getTextInsideBracket(line.name_chi) : null;
    const subline_name_eng = line.line_group_id ? $.getTextInsideBracket(line.name_eng) : null;
    const line_group_id = line.line_group_id;

    //Make RailLine Item
    if (!line_group_mapping[line_group_id] || line_group_id == null){
        rail_line_id = uuid();
        if (line_group_id){
            line_group_mapping[line_group_id] = rail_line_id;
        }
        await $.insertData(client_new, '_rail_lines', {
            id: rail_line_id,
            project_id: 'hongon',
            rail_line_type_id: line_types_id_uuid[line.line_type_id],
            name: line_name_chi,
            name_l: { "en": line_name_eng || "" },
            name_short: line_name_eng_short,
            remarks: line.remarks,
            _names: `|${line_name_chi||''}|${line_name_eng||''}|${line_name_eng_short||''}`,
            created_at: Math.floor(new Date().getTime() / 1000),
            created_by: 'hongon',
        });
        console.log(chalk.yellow(`[Line] `) + `${line_name_chi} / ${line_name_eng}`);
    }

    //Prepare Sections
    const sections = (line_stations[line.id] || []).map(section => {
        if (!Array.isArray(section.segments)) section.segments = [];
        return {
            id: section.id,
            station_id: section.station_id,
            no_tracks: section.no_tracks,
            u_default: 1,
            d_default: Math.min(2, section.no_tracks),
            remarks: section.remarks,
            show_arrival: section.show_arrival,
            max_speed_kph: section.max_speed_kph,
            min_runtime: {},
            segments: section.segments.map(segment => ({
                x2: $.getLongitudeShift(segment.x2),
                y2: $.getLongitudeShift(segment.y2),
                x: $.getLatitude(segment.x),
                y: $.getLatitude(segment.y),
                x1: $.getLatitudeShift(segment.x1),
                y1: $.getLatitudeShift(segment.y1),
            })),
            _distance_km: null,
            _mileage_km: null,
            _x_min: null,
            _x_max: null,
            _y_min: null,
            _y_max: null,
        };
    });

    //Make RailLineSub Item
    await $.insertData(client_new, '_rail_lines_sub', {
        id: line.id,
        project_id: 'hongon',
        rail_line_id: rail_line_id,
        rail_operator_id: operator_id_mapping[line.operator_id],
        name: subline_name_chi,
        name_l: { "en": subline_name_eng || "" },
        color: line.color,
        color_text: line.color_text,
        remarks: line.remarks,
        max_speed_kph: line.max_speed_kph,
        sections: sections,
        _names: `|${subline_name_chi||''}|${subline_name_eng||''}`,
        _x_min: $.getLongitude(line.x_min),
        _x_max: $.getLongitude(line.x_max),
        _y_min: $.getLatitude(line.y_min),
        _y_max: $.getLatitude(line.y_max),
        created_at: Math.floor(new Date().getTime() / 1000),
        created_by: 'hongon',
    });
    if (subline_name_chi || subline_name_eng){
        console.log(chalk.blue(`[Sub] ${subline_name_chi} / ${subline_name_eng}`));
    }else{
        console.log(chalk.blue(`[Sub] #`));
    }

}

/**
 * End
 */
 process.exit(1);