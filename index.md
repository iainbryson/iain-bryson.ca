---
layout: page
title: Welcome
tagline: starting point &middot; personal playground
---
{% include JB/setup %}

Hello, and welcome.  

This is the main site for Iain Bryson, currently residing in Seattle Washington.

We recognize that you have a choice in which Iain Brysons' site you visit, and thank you for choosing ours.

## Projects

<ul>
{% for page in site.pages %}
{% for tag in page.tags %}
{% if tag == 'project' %}
    <li><a href="{{ BASE_PATH }}{{ page.url }}">{{ page.title }}</a></li>
{% endif %}
{% endfor %}
{% endfor %}
</ul>


## Articles

<ul class="posts">
  {% for post in site.posts %}
    <li><span>{{ post.date | date_to_string }}</span> &raquo; <a href="{{ BASE_PATH }}{{ post.url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>


