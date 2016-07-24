<?PHP
    mysql_connect("localhost", "artur", "Q5wcNLRfXV4uwajJ");
    mysql_select_db("artur");
    mysql_query("SET NAMES 'utf8'");
    mysql_query("SET CHARACTER SET 'utf8'");
    mysql_query("SET SESSION collation_connection = 'utf8_general_ci'");

    $urfurating = mysql_query("SELECT * FROM ratingurfu;");
    $urfuratingArr = array();
    $urfuratingTotal = 0;

    while ($row = mysql_fetch_object($urfurating)) {
        $urfuratingArr[] = $row;
        $urfuratingTotal += $row->count;
    }

    function cmp($a, $b)
    {
        if ($a->count == $b->count) {
            return 0;
        }
        return ($a->count < $b->count) ? 1 : -1;
    }

    usort($urfuratingArr, "cmp");
?>

<!DOCTYPE HTML>
<html>

    <head>
        <meta charset="utf-8">
        <title>Рейтинг</title>
    </head>

    <body>
        <table border="1" align="center" width="50%">
            <caption>Рейтинг институтов УрФУ</caption>

            <tr>
                <th></th>
                <th>Институт</th>
                <th>Количество ссылок</th>
                <th>Количество ссылок, %</th>
            </tr>

            <?PHP
                if ($urfurating) {
                    foreach ($urfuratingArr as $key => $value) {
                        $i = $key + 1;
                        echo "
                            <tr>
                                <td>$i</td>
                                <td>$value->name</td>
                                <td align=\"right\">$value->count</td>
                                <td align=\"right\">0</td>
                            </tr>
                            ";
                    }
                }
            ?>
        </table>

        <br>

        <table border="1" align="center" width="50%">
            <caption>Рейтинг видов спорта УрФУ</caption>

            <tr>
                <th></th>
                <th>Вид спорта</th>
                <th>Количество ссылок</th>
                <th>Количество ссылок, %</th>
            </tr>


    <tr>
        <td>1</td>
        <td>Футбол</td>
        <td align="right">49</td>
        <td align="right">57.6471</td>
    </tr>

    <tr>
        <td>2</td>
        <td>Мини-футбол</td>
        <td align="right">15</td>
        <td align="right">17.6471</td>
    </tr>

    <tr>
        <td>3</td>
        <td>Гандбол</td>
        <td align="right">12</td>
        <td align="right">14.1176</td>
    </tr>

    <tr>
        <td>4</td>
        <td>Баскетбол</td>
        <td align="right">2</td>
        <td align="right">2.3529</td>
    </tr>

    <tr>
        <td>5</td>
        <td>Бокс</td>
        <td align="right">2</td>
        <td align="right">2.3529</td>
    </tr>

    <tr>
        <td>6</td>
        <td>Волейбол</td>
        <td align="right">2</td>
        <td align="right">2.3529</td>
    </tr>

    <tr>
        <td>7</td>
        <td>Вольная борьба</td>
        <td align="right">1</td>
        <td align="right">1.1765</td>
    </tr>

    <tr>
        <td>8</td>
        <td>Легкая атлетика</td>
        <td align="right">1</td>
        <td align="right">1.1765</td>
    </tr>

    <tr>
        <td>9</td>
        <td>Дзюдо</td>
        <td align="right">1</td>
        <td align="right">1.1765</td>
    </tr>

        </table>

        <br>

        <table border="1" align="center" width="50%">
            <caption>Рейтинг персоналий УрФУ</caption>

            <tr>
                <th></th>
                <th></th>
                <th>Количество ссылок</th>
            </tr>


    <tr>
        <td>1</td>
        <td align="left">Шурманов Евгений Геннадьевич</td>
        <td align="right">10</td>
    </tr>

    <tr>
        <td>2</td>
        <td align="left">Набойченко Евгений Станиславович</td>
        <td align="right">7</td>
    </tr>

    <tr>
        <td>3</td>
        <td align="left">Серова Нина Борисовна</td>
        <td align="right">4</td>
    </tr>

    <tr>
        <td>4</td>
        <td align="left">Пиратинский Александр Ефимович</td>
        <td align="right">4</td>
    </tr>

    <tr>
        <td>5</td>
        <td align="left">Полозов Андрей Анатольевич</td>
        <td align="right">3</td>
    </tr>

    <tr>
        <td>6</td>
        <td align="left">Гайл Виктор Вадимович</td>
        <td align="right">3</td>
    </tr>

    <tr>
        <td>7</td>
        <td align="left">Долганов Олег Владиславович</td>
        <td align="right">3</td>
    </tr>

    <tr>
        <td>8</td>
        <td align="left">Капник Лев Аронович</td>
        <td align="right">3</td>
    </tr>

    <tr>
        <td>9</td>
        <td align="left">Спирина Марина Павловна</td>
        <td align="right">3</td>
    </tr>

        </table>

        <br>

        <table border="1" align="center" width="50%">
            <caption>Рейтинг вузов России</caption>

            <tr>
                <th></th>
                <th>Институт</th>
                <th>Количество ссылок</th>
                <th>Количество ссылок, %</th>
            </tr>

            <tr>
                <td>1</td>
                <td>Сибирский федеральный университет</td>
                <td align="right">96</td>
                <td align="right">1.9516</td>
            </tr>

            <tr>
                <td>2</td>
                <td>Российский медицинский университет им. Н. И. Пирогова Минздравсоцразвития России</td>
                <td align="right">95</td>
                <td align="right">1.9313</td>
            </tr>

            <tr>
                <td>3</td>
                <td>Томский государственный университет систем управления и радиоэлектроники (ТУСУР)</td>
                <td align="right">94</td>
                <td align="right">1.9110</td>
            </tr>

            <tr>
                <td>4</td>
                <td>Томский политехнический университет</td>
                <td align="right">94</td>
                <td align="right">1.9110</td>
            </tr>

            <tr>
                <td>5</td>
                <td>Московский авиационный институт</td>
                <td align="right">93</td>
                <td align="right">1.8906</td>
            </tr>

            <tr>
                <td>6</td>
                <td>Московский технический университет связи и информатики</td>
                <td align="right">92</td>
                <td align="right">1.8703</td>
            </tr>

            <tr>
                <td>7</td>
                <td>Московский государственный университет тонких химических технологий им. М. В. Ломоносова</td>
                <td align="right">92</td>
                <td align="right">1.8703</td>
            </tr>

            <tr>
                <td>8</td>
                <td>Санкт-Петербургский государственный политехнический университет</td>
                <td align="right">89</td>
                <td align="right">1.8093</td>
            </tr>

            <tr>
                <td>9</td>
                <td>Казанский технологический университет</td>
                <td align="right">89</td>
                <td align="right">1.8093</td>
            </tr>

            <tr>
                <td>10</td>
                <td>Казанский технический университет им. А. Н. Туполева</td>
                <td align="right">89</td>
                <td align="right">1.8093</td>
            </tr>

            <tr>
                <td>11</td>
                <td>Всероссийская академия внешней торговли</td>
                <td align="right">89</td>
                <td align="right">1.8093</td>
            </tr>

            <tr>
                <td>12</td>
                <td>Государственный университет управления</td>
                <td align="right">86</td>
                <td align="right">1.7483</td>
            </tr>

            <tr>
                <td>13</td>
                <td>Саратовский государственный университет имени Н. Г. Чернышевского</td>
                <td align="right">85</td>
                <td align="right">1.7280</td>
            </tr>

            <tr>
                <td>14</td>
                <td>МАТИ - Российский государственный технологический университет им. К. Э. Циолковского</td>
                <td align="right">84</td>
                <td align="right">1.7077</td>
            </tr>

            <tr>
                <td>15</td>
                <td>Российский экономический университет им. Г. В. Плеханова</td>
                <td align="right">84</td>
                <td align="right">1.7077</td>
            </tr>

            <tr>
                <td>16</td>
                <td>Иркутский государственный технический университет</td>
                <td align="right">84</td>
                <td align="right">1.7077</td>
            </tr>

            <tr>
                <td>17</td>
                <td>Санкт-Петербургский государственный университет информационных технологий, механики и оптики</td>
                <td align="right">80</td>
                <td align="right">1.6263</td>
            </tr>

            <tr>
                <td>18</td>
                <td>Кубанский государственный университет</td>
                <td align="right">79</td>
                <td align="right">1.6060</td>
            </tr>

            <tr>
                <td>19</td>
                <td>Мордовский государственный университет им. Н. П. Огарева</td>
                <td align="right">78</td>
                <td align="right">1.5857</td>
            </tr>

            <tr>
                <td>20</td>
                <td>Петрозаводский государственный университет</td>
                <td align="right">77</td>
                <td align="right">1.5654</td>
            </tr>

            <tr>
                <td>21</td>
                <td>Российский университет дружбы народов</td>
                <td align="right">76</td>
                <td align="right">1.5450</td>
            </tr>

            <tr>
                <td>22</td>
                <td>Дальневосточный федеральный университет</td>
                <td align="right">75</td>
                <td align="right">1.5247</td>
            </tr>

            <tr>
                <td>23</td>
                <td>Уфимский государственный нефтяной технический университет</td>
                <td align="right">74</td>
                <td align="right">1.5044</td>
            </tr>

            <tr>
                <td>24</td>
                <td>Московский государственный институт международных отношений (университет) МИД России</td>
                <td align="right">74</td>
                <td align="right">1.5044</td>
            </tr>

            <tr>
                <td>25</td>
                <td>Российский государственный гуманитарный университет</td>
                <td align="right">73</td>
                <td align="right">1.4840</td>
            </tr>

            <tr>
                <td>26</td>
                <td>Санкт-Петербургский государственный университет телекоммуникаций им. проф. М. А. Бонч-Бруевича</td>
                <td align="right">70</td>
                <td align="right">1.4231</td>
            </tr>

            <tr>
                <td>27</td>
                <td>Кубанский государственный технологический университет</td>
                <td align="right">69</td>
                <td align="right">1.4027</td>
            </tr>

            <tr>
                <td>28</td>
                <td>Рыбинский государственный авиационный технический университет им. П. А. Соловьева</td>
                <td align="right">69</td>
                <td align="right">1.4027</td>
            </tr>

            <tr>
                <td>29</td>
                <td>Новосибирский государственный университет экономики и управления</td>
                <td align="right">68</td>
                <td align="right">1.3824</td>
            </tr>

            <tr>
                <td>30</td>
                <td>Национальный исследовательский технологический университет "МИСиС"</td>
                <td align="right">67</td>
                <td align="right">1.3621</td>
            </tr>

            <tr>
                <td>31</td>
                <td>Национальный минерально-сырьевой университет "Горный"</td>
                <td align="right">64</td>
                <td align="right">1.3011</td>
            </tr>

            <tr>
                <td>32</td>
                <td>Московский государственный строительный университет</td>
                <td align="right">64</td>
                <td align="right">1.3011</td>
            </tr>

            <tr>
                <td>33</td>
                <td>Новосибирский государственный университет</td>
                <td align="right">64</td>
                <td align="right">1.3011</td>
            </tr>

            <tr>
                <td>34</td>
                <td>Саратовский государственный технический университет им. Ю. А. Гагарина</td>
                <td align="right">61</td>
                <td align="right">1.2401</td>
            </tr>

            <tr>
                <td>35</td>
                <td>Московский энергетический институт</td>
                <td align="right">60</td>
                <td align="right">1.2198</td>
            </tr>

            <tr>
                <td>36</td>
                <td>Российский государственный педагогический университет им. А. И. Герцена</td>
                <td align="right">60</td>
                <td align="right">1.2198</td>
            </tr>

            <tr>
                <td>37</td>
                <td>Московский государственный университет путей сообщения (МИИТ)</td>
                <td align="right">60</td>
                <td align="right">1.2198</td>
            </tr>

            <tr>
                <td>38</td>
                <td>Воронежский государственный университет</td>
                <td align="right">59</td>
                <td align="right">1.1994</td>
            </tr>

            <tr>
                <td>39</td>
                <td>Российский химико-технологический университет им. Д. И. Менделеева</td>
                <td align="right">58</td>
                <td align="right">1.1791</td>
            </tr>

            <tr>
                <td>40</td>
                <td>Кабардино-Балкарский государственный университет им. Х. М. Бербекова</td>
                <td align="right">58</td>
                <td align="right">1.1791</td>
            </tr>

            <tr>
                <td>41</td>
                <td>Высшая школа экономики</td>
                <td align="right">57</td>
                <td align="right">1.1588</td>
            </tr>

            <tr>
                <td>42</td>
                <td>Ивановский государственный энергетический университет им. В. И. Ленина</td>
                <td align="right">57</td>
                <td align="right">1.1588</td>
            </tr>

            <tr>
                <td>43</td>
                <td>Российский государственный университет нефти и газа им. И. М. Губкина</td>
                <td align="right">56</td>
                <td align="right">1.1384</td>
            </tr>

            <tr>
                <td>44</td>
                <td>Сибирский государственный медицинский университет</td>
                <td align="right">56</td>
                <td align="right">1.1384</td>
            </tr>

            <tr>
                <td>45</td>
                <td>Российская академия народного хозяйства и государственной службы при Президенте РФ</td>
                <td align="right">55</td>
                <td align="right">1.1181</td>
            </tr>

            <tr>
                <td>46</td>
                <td>Самарский государственный аэрокосмический университет им. акад. С. П. Королева</td>
                <td align="right">54</td>
                <td align="right">1.0978</td>
            </tr>

            <tr>
                <td>47</td>
                <td>Уральская государственная медицинская академия</td>
                <td align="right">54</td>
                <td align="right">1.0978</td>
            </tr>

            <tr>
                <td>48</td>
                <td>Кемеровский государственный университет</td>
                <td align="right">52</td>
                <td align="right">1.0571</td>
            </tr>

            <tr>
                <td>49</td>
                <td>Уфимский государственный авиационный технический университет</td>
                <td align="right">52</td>
                <td align="right">1.0571</td>
            </tr>

            <tr>
                <td>50</td>
                <td>1-й Московский государственный медицинский университет им. И. М. Сеченова</td>
                <td align="right">51</td>
                <td align="right">1.0368</td>
            </tr>

            <tr>
                <td>51</td>
                <td>Башкирский государственный университет</td>
                <td align="right">49</td>
                <td align="right">0.9961</td>
            </tr>

            <tr>
                <td>52</td>
                <td>Московский государственный университет экономики, статистики и информатики (МЭСИ)</td>
                <td align="right">48</td>
                <td align="right">0.9758</td>
            </tr>

            <tr>
                <td>53</td>
                <td>Национальный исследовательский ядерный университет "МИФИ"</td>
                <td align="right">47</td>
                <td align="right">0.9555</td>
            </tr>

            <tr>
                <td>54</td>
                <td>Южный федеральный университет</td>
                <td align="right">46</td>
                <td align="right">0.9351</td>
            </tr>

            <tr>
                <td>55</td>
                <td>Казанский (Приволжский) федеральный университет</td>
                <td align="right">45</td>
                <td align="right">0.9148</td>
            </tr>

            <tr>
                <td>56</td>
                <td>Иркутский государственный университет</td>
                <td align="right">41</td>
                <td align="right">0.8335</td>
            </tr>

            <tr>
                <td>57</td>
                <td>Южно-Российский государственный технический университет (Новочеркасский политехнический институт) имени М. И. Платова</td>
                <td align="right">40</td>
                <td align="right">0.8132</td>
            </tr>

            <tr>
                <td>58</td>
                <td>Московский государственный технический университет им. Н. Э. Баумана</td>
                <td align="right">39</td>
                <td align="right">0.7928</td>
            </tr>

            <tr>
                <td>59</td>
                <td>Тюменский государственный нефтегазовый университет</td>
                <td align="right">39</td>
                <td align="right">0.7928</td>
            </tr>

            <tr>
                <td>60</td>
                <td>Нижегородский государственный университет им. Н. И. Лобачевского</td>
                <td align="right">39</td>
                <td align="right">0.7928</td>
            </tr>

            <tr>
                <td>61</td>
                <td>Тольяттинский государственный университет</td>
                <td align="right">38</td>
                <td align="right">0.7725</td>
            </tr>

            <tr>
                <td>62</td>
                <td>Воронежская государственная медицинская академия им. Н. Н. Бурденко</td>
                <td align="right">37</td>
                <td align="right">0.7522</td>
            </tr>

            <tr>
                <td>63</td>
                <td>Белгородский государственный технологический университет им. В. Г. Шухова</td>
                <td align="right">37</td>
                <td align="right">0.7522</td>
            </tr>

            <tr>
                <td>64</td>
                <td>Томский государственный университет</td>
                <td align="right">36</td>
                <td align="right">0.7319</td>
            </tr>

            <tr>
                <td>65</td>
                <td>Юго-Западный государственный университет</td>
                <td align="right">35</td>
                <td align="right">0.7115</td>
            </tr>

            <tr>
                <td>66</td>
                <td>Астраханский государственный технический университет</td>
                <td align="right">34</td>
                <td align="right">0.6912</td>
            </tr>

            <tr>
                <td>67</td>
                <td>Самарский государственный технический университет</td>
                <td align="right">34</td>
                <td align="right">0.6912</td>
            </tr>

            <tr>
                <td>68</td>
                <td>Московский архитектурный институт (государственная академия)</td>
                <td align="right">34</td>
                <td align="right">0.6912</td>
            </tr>

            <tr>
                <td>69</td>
                <td>Санкт-Петербургский государственный университет аэрокосмического приборостроения</td>
                <td align="right">34</td>
                <td align="right">0.6912</td>
            </tr>

            <tr>
                <td>70</td>
                <td>Уральский федеральный университет им. первого президента России Б. Н. Ельцина</td>
                <td align="right">34</td>
                <td align="right">0.6912</td>
            </tr>

            <tr>
                <td>71</td>
                <td>Московский государственный технологический университет "СТАНКИН"</td>
                <td align="right">31</td>
                <td align="right">0.6302</td>
            </tr>

            <tr>
                <td>72</td>
                <td>Московский государственный технический университет радиотехники, электроники и автоматики (МИРЭА)</td>
                <td align="right">30</td>
                <td align="right">0.6099</td>
            </tr>

            <tr>
                <td>73</td>
                <td>Московский физико-технический институт</td>
                <td align="right">27</td>
                <td align="right">0.5489</td>
            </tr>

            <tr>
                <td>74</td>
                <td>Уральский государственный университет путей сообщения</td>
                <td align="right">27</td>
                <td align="right">0.5489</td>
            </tr>

            <tr>
                <td>75</td>
                <td>Северо-Западный государственный медицинский университет им. И. И. Мечникова</td>
                <td align="right">27</td>
                <td align="right">0.5489</td>
            </tr>

            <tr>
                <td>76</td>
                <td>Российский новый университет</td>
                <td align="right">25</td>
                <td align="right">0.5082</td>
            </tr>

            <tr>
                <td>77</td>
                <td>Ульяновский государственный университет</td>
                <td align="right">25</td>
                <td align="right">0.5082</td>
            </tr>

            <tr>
                <td>78</td>
                <td>Алтайский государственный университет</td>
                <td align="right">25</td>
                <td align="right">0.5082</td>
            </tr>

            <tr>
                <td>79</td>
                <td>Московский государственный университет им. М. В. Ломоносова</td>
                <td align="right">25</td>
                <td align="right">0.5082</td>
            </tr>

            <tr>
                <td>80</td>
                <td>Финансовый университет при Правительстве РФ</td>
                <td align="right">24</td>
                <td align="right">0.4879</td>
            </tr>

            <tr>
                <td>81</td>
                <td>Новосибирский государственный технический университет</td>
                <td align="right">23</td>
                <td align="right">0.4676</td>
            </tr>

            <tr>
                <td>82</td>
                <td>Пермский политехнический университет</td>
                <td align="right">21</td>
                <td align="right">0.4269</td>
            </tr>

            <tr>
                <td>83</td>
                <td>Пермский государственный университет</td>
                <td align="right">20</td>
                <td align="right">0.4066</td>
            </tr>

            <tr>
                <td>84</td>
                <td>Московская международная высшая школа бизнеса "МИРБИС" (Институ</td>
                <td align="right">19</td>
                <td align="right">0.3863</td>
            </tr>

            <tr>
                <td>85</td>
                <td>Уральская государственная юридическая академия</td>
                <td align="right">19</td>
                <td align="right">0.3863</td>
            </tr>

            <tr>
                <td>86</td>
                <td>Московский государственный горный университет (рейтинг считался отдельно от МИСиС, к которому Горный университет сейчас присоединен)</td>
                <td align="right">18</td>
                <td align="right">0.3659</td>
            </tr>

            <tr>
                <td>87</td>
                <td>Ижевский государственный технический университет им. М. Т. Калашникова</td>
                <td align="right">15</td>
                <td align="right">0.3049</td>
            </tr>

            <tr>
                <td>88</td>
                <td>Московская государственная юридическая академия им. О. Е. Кутафина</td>
                <td align="right">14</td>
                <td align="right">0.2846</td>
            </tr>

            <tr>
                <td>89</td>
                <td>Национальный исследовательский университет "МИЭТ"</td>
                <td align="right">14</td>
                <td align="right">0.2846</td>
            </tr>

            <tr>
                <td>90</td>
                <td>Ярославский государственный университет им. П. Г. Демидова</td>
                <td align="right">13</td>
                <td align="right">0.2643</td>
            </tr>

            <tr>
                <td>91</td>
                <td>Вологодский государственный технический университет</td>
                <td align="right">11</td>
                <td align="right">0.2236</td>
            </tr>

            <tr>
                <td>92</td>
                <td>Белгородский государственный университет</td>
                <td align="right">11</td>
                <td align="right">0.2236</td>
            </tr>

            <tr>
                <td>93</td>
                <td>Омская государственная медицинская академия</td>
                <td align="right">9</td>
                <td align="right">0.1830</td>
            </tr>

            <tr>
                <td>94</td>
                <td>Санкт-Петербургский государственный медицинский университет им. акад. И. П. Павлова</td>
                <td align="right">9</td>
                <td align="right">0.1830</td>
            </tr>

            <tr>
                <td>95</td>
                <td>Санкт-Петербургский государственный инженерно-экономический университет</td>
                <td align="right">9</td>
                <td align="right">0.1830</td>
            </tr>

            <tr>
                <td>96</td>
                <td>Саратовский государственный медицинский университет имени В. И. Разумовского</td>
                <td align="right">6</td>
                <td align="right">0.1220</td>
            </tr>

            <tr>
                <td>97</td>
                <td>Самарский государственный университет</td>
                <td align="right">6</td>
                <td align="right">0.1220</td>
            </tr>

            <tr>
                <td>98</td>
                <td>Самарский государственный медицинский университет</td>
                <td align="right">6</td>
                <td align="right">0.1220</td>
            </tr>

            <tr>
                <td>99</td>
                <td>Санкт-Петербургский государственный университет</td>
                <td align="right">5</td>
                <td align="right">0.1016</td>
            </tr>

            <tr>
                <td>100</td>
                <td>Омский государственный университет им. Ф. М. Достоевского</td>
                <td align="right">3</td>
                <td align="right">0.0610</td>
            </tr>

        </table>
    </body>
</html>
