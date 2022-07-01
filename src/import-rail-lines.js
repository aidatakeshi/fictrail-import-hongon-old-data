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

let lines = {};
for (let item of res2.rows){
    const group = item.line_group_id || item.id;
    if (!lines[group]) lines[group] = [];
    lines[group].push(item);
}

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

//Insert to New Database
console.log(boxen('RailLines & RailLinesSub (originally LineGroups, Lines & LineStations)'));

for (let id in lines){
    const rail_line_subs = lines[id];
    const rail_line = rail_line_subs[0];

    //Prepare line data
    const rail_line_name_chi = rail_line.line_group_id ? rail_line.g_name_chi : rail_line.name_chi;
    const rail_line_name_eng = rail_line.line_group_id ? rail_line.g_name_eng : rail_line.name_eng;
    const rail_line_name_eng_short = rail_line.g_name_eng_short || rail_line.name_eng_short;
    const rail_line_id = uuid();
    let rail_line_data = {
        id: rail_line_id,
        project_id: 'hongon',
        rail_line_type_id: line_types_id_uuid[rail_line.line_type_id],
        name: rail_line_name_chi,
        name_l: { "en": rail_line_name_eng || "" },
        name_short: rail_line_name_eng_short,
        remarks: rail_line.remarks,
        _names: `|${rail_line_name_chi||''}|${rail_line_name_eng||''}|${rail_line_name_eng_short||''}`,
        _rail_operator_ids: '',
        _length_km: 0,
        _x_min: null, _x_max: null,
        _y_min: null, _y_max: null,
        created_at: Math.floor(new Date().getTime() / 1000),
        created_by: 'hongon',
    };
    console.log(chalk.yellow(`[Line] `) + `${rail_line_name_chi} / ${rail_line_name_eng}`);

    //For each line_sub
    let sub_items = [];
    for (let rail_line_sub of rail_line_subs){

        //Prepare Sections
        const sections = (line_stations[rail_line.id] || []).map(section => {
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
                _distance_km: section.distance_km,
                _mileage_km: section.mileage_km,
                _x_min: !section.segments.length ? null
                        : $.getLatitude(Math.min(...section.segments.map(segment => segment.x))),
                _x_max: !section.segments.length ? null
                        : $.getLatitude(Math.max(...section.segments.map(segment => segment.x))),
                _y_min: !section.segments.length ? null
                        : $.getLongitude(Math.min(...section.segments.map(segment => segment.y))),
                _y_max: !section.segments.length ? null
                        : $.getLongitude(Math.max(...section.segments.map(segment => segment.y))),
            };
        });
        
        //Make RailLineSub Item
        const subline_name_chi = rail_line.line_group_id ? $.getTextInsideBracket(rail_line_sub.name_chi) : null;
        const subline_name_eng = rail_line.line_group_id ? $.getTextInsideBracket(rail_line_sub.name_eng) : null;
        const rail_operator_id = operator_id_mapping[rail_line_sub.operator_id];
        let rail_line_sub_data = {
            id: rail_line_sub.id,
            project_id: 'hongon',
            rail_line_id: rail_line_id,
            rail_operator_id: rail_operator_id,
            name: subline_name_chi,
            name_l: { "en": subline_name_eng || "" },
            color: rail_line_sub.color,
            color_text: rail_line_sub.color_text,
            remarks: rail_line_sub.remarks,
            max_speed_kph: rail_line_sub.max_speed_kph,
            sections: sections,
            _names: rail_line_data._names + `|${subline_name_chi||''}|${subline_name_eng||''}`,
            _length_km: rail_line_sub.length_km,
            _x_min: $.getLongitude(rail_line_sub.x_min),
            _x_max: $.getLongitude(rail_line_sub.x_max),
            _y_min: $.getLatitude(rail_line_sub.y_min),
            _y_max: $.getLatitude(rail_line_sub.y_max),
            _station_ids: sections.map((section) => section.station_id)
            .map(id => (id ? `|${id}` : '')).join(''),
            created_at: Math.floor(new Date().getTime() / 1000),
            created_by: 'hongon',
        };
        sub_items.push(rail_line_sub_data);

        if (subline_name_chi || subline_name_eng){
            console.log(chalk.blue(`[Sub] ${subline_name_chi} / ${subline_name_eng}`));
        }else{
            console.log(chalk.blue(`[Sub] #`));
        }
        
        //Insert to _rail_lines_sub
        await $.insertData(client_new, '_rail_lines_sub', rail_line_sub_data);

    }

    //Aggregate Sub-line Data to Line
    rail_line_data._length_km = sub_items.map(item => item._length_km)
    .filter(item => Number.isFinite(item))
    .reduce((prev, curr) => (prev + curr), 0);
    rail_line_data._x_min = Math.min(...sub_items.map(item => item._x_min));
    rail_line_data._x_max = Math.max(...sub_items.map(item => item._x_max));
    rail_line_data._y_min = Math.min(...sub_items.map(item => item._y_min));
    rail_line_data._y_max = Math.max(...sub_items.map(item => item._y_max));
    rail_line_data._rail_operator_ids = sub_items.map(item => `|${item.rail_operator_id}`)
    .filter((val, index, self) => (self.indexOf(val) === index)).join('');

    //Insert to _rail_lines
    await $.insertData(client_new, '_rail_lines', rail_line_data);

}

/**
 * End
 */
 process.exit(1);