use chrono::{DateTime, FixedOffset, NaiveDate, TimeZone};

fn _parse_month_str_to_number(month: &str) -> Option<u32> {
    let month_lower = month.to_lowercase();
    Some(match month_lower.as_str() {
        "januari" => 1,
        "februari" => 2,
        "maret" => 3,
        "april" => 4,
        "mei" => 5,
        "juni" => 6,
        "juli" => 7,
        "agustus" => 8,
        "september" => 9,
        "oktober" => 10,
        "november" => 11,
        "desember" => 12,
        _ => return None,
    })
}

fn _parse_time_period_str_to_24(time_str: &str) -> Option<(u32, u32)> {
    let split_time_period: Vec<&str> = time_str.split_whitespace().collect();

    if split_time_period.len() != 2 {
        return None;
    }

    let split_time: Vec<&str> = split_time_period[0].split(":").collect();

    let mut hour: u32 = split_time[0].parse().ok()?;
    let minute: u32 = split_time[1].parse().ok()?;
    let time_period = split_time_period[1];

    if time_period == "pm" && hour != 12 {
        hour += 12;
    }

    if time_period == "am" && hour == 12 {
        hour = 0;
    }

    Some((hour, minute))
}

pub fn _parse_indonesia_date(
    string_date: &str,
    string_time: &str,
) -> Result<DateTime<FixedOffset>, String> {
    let split_date: Vec<&str> = string_date.split_whitespace().collect();

    if split_date.len() != 2 {
        return Err(format!(
            "Unexpected date length (string_date: {string_date} and string_time: {string_time})"
        )
        .to_string());
    }

    let day: u32 = split_date[0]
        .parse()
        .map_err(|_e| "Cannot parse day".to_string())?;

    let split_date: Vec<&str> = split_date[1].split(",").collect();

    if split_date.len() != 2 {
        return Err(format!(
            "Unexpected date length (string_date: {string_date} and string_time: {string_time})"
        )
        .to_string());
    }

    let month_str = split_date[0];
    let month = _parse_month_str_to_number(month_str).ok_or("Cannot parse day")?;

    let year: i32 = split_date[1]
        .parse()
        .map_err(|_e| "Cannot parse year".to_string())?;

    let (hour, minute) = _parse_time_period_str_to_24(&string_time.replace("Release on ", ""))
        .ok_or(format!(
            "Cannot parse time period (string_time: {})",
            &string_time.replace("Release on ", "")
        ))?;

    let naive = NaiveDate::from_ymd_opt(year, month, day)
        .ok_or_else(|| "Failed to create naive date".to_string())?
        .and_hms_opt(hour, minute, 0)
        .ok_or_else(|| "Failed to create naive date time".to_string())?;

    let wib_offset =
        FixedOffset::east_opt(7 * 3600).ok_or("Cannot parse fixed offset for utc+7")?;

    wib_offset
        .from_local_datetime(&naive)
        .single()
        .ok_or_else(|| "Failed to create date time".to_string())
}
