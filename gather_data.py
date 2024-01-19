import pandas as pd
# this is so dumb I hate this warning more than anything
pd.options.mode.chained_assignment = None
import time


# Collect dataframe of yearly team records
years = range(1977, 2024)
dfs = []
for year in years: # since the first year of the merger
  year_dfs = pd.read_html(f"https://www.basketball-reference.com/leagues/NBA_{year}_standings.html#expanded_standings")

  # find the dfs
  for d in year_dfs:
    if 'Eastern Conference' in d.columns:
      east_df = d
    elif 'Western Conference' in d.columns:
      west_df = d

  east_df['Team'] = [x.replace('*','') for x in east_df['Eastern Conference']]
  east_df = east_df[['Team', 'W', 'L']]
  east_df['Conf'] = ['East']*len(east_df)

  west_df['Team'] = [x.replace('*','') for x in west_df['Western Conference']]
  west_df = west_df[['Team', 'W', 'L']]
  west_df['Conf'] = ['West']*len(west_df)

  df = pd.concat([east_df, west_df])
  df['Year'] = [year]*len(df)

  df = df[['Division' not in x for x in df.Team]]

  dfs.append(df)

  time.sleep(10)

yearly_standings = pd.concat(dfs)


# Collect all unique team names
teams = yearly_standings.Team.unique()


# count the yearly win/loss totals for each team
for team in teams:
  team_standings = yearly_standings[yearly_standings.Team == team]
  scores = []
  score = 0
  for year in years:
    # this accounts for years that this team didn't exist
    if len(team_standings[team_standings.Year == year]) == 0:
      scores.append(0)
      continue
    wins = int(team_standings[team_standings.Year == year].W)
    score += wins
    losses = int(team_standings[team_standings.Year == year].L)
    score -= losses
    scores.append(score)


  team_name = team if team != 'New Orleans/Oklahoma City Hornets' else 'Oklahoma City Hornets' # This is the only weird one... why is there a forward slash in the name I have no idea
  pd.DataFrame({'year':years, 'win_loss':scores}).to_csv(f"data/{team_name}_win_loss.csv", index=False)