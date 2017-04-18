# Grid Filter Extension

Datagrids are used a lot to export data to Excel or CSV for reporting purposes. Everytime an user needs to configure the same filters to get the data they need. This widget stores the properties in the database and loads it again when needed.

## Typical usage scenario

When users search always for the same data with the same filters on a datagrid or templategrid. It's easier to store and load the filters.

## Features and limitations

- Store and load the values that are placed in the filters of a grid.
- The Store and Load buttons will be put behind the Search and Reset buttons.
- The user can give there own names to the properties.
- Supports single input filters, multiple selection filters aren't supported.

## Installation

- Download the widget from the appstore!

## Configuration

- Place the widget below the datagrid for order of loading.
- Make sure the grid has an unique readable name and place that in the property 'Datagrid/Templategrid name' so the widget can find the grid.
- An entity is needed containing 3 attributes:
- String to store the name of the Grid
- String to store the name of the filter the user will give.
- Unlimited string attribute to store all filter values (JSON Structure